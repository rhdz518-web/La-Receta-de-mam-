import React, { createContext, useReducer, useEffect, Dispatch, ReactNode } from 'react';
import { AppState, Order, Affiliate, InventoryChange, OrderStatus, AffiliateStatus, InventoryChangeStatus, Referral, Coupon, ReferralStatus, User, CashOut, CashOutStatus } from '../types';
import { DEFAULT_COMMISSION_PER_TORTILLA_CENTS, REWARD_TORTILLAS, TORTILLA_PRICE } from '../constants';
import { db, increment } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";


// Define action types
type Action =
    | { type: 'LOGIN'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'AFFILIATE_LOGIN'; payload: Affiliate }
    | { type: 'AFFILIATE_LOGOUT' }
    | { type: 'ADD_OR_UPDATE_USER'; payload: User }
    | { type: 'ADD_ORDER'; payload: Order }
    | { type: 'UPDATE_ORDER_STATUS'; payload: { order: Order; status: OrderStatus } }
    | { type: 'CONFIRM_TRANSFER_PAYMENT'; payload: { orderId: string } }
    | { type: 'ADD_REFERRAL'; payload: Referral }
    | { type: 'COMPLETE_REFERRAL'; payload: { referral: Referral; couponCode: string } }
    | { type: 'TOGGLE_COUPON_STATUS'; payload: { coupon: Coupon } }
    | { type: 'DELETE_COUPON'; payload: { couponCode: string } }
    | { type: 'APPLY_FOR_AFFILIATE'; payload: Affiliate }
    | { type: 'UPDATE_AFFILIATE_STATUS'; payload: { affiliateId: string; status: AffiliateStatus } }
    | { type: 'TOGGLE_AFFILIATE_DELIVERY'; payload: { affiliate: Affiliate } }
    | { type: 'UPDATE_AFFILIATE_SETTINGS'; payload: { affiliateId: string; address: string; deliveryCost: number } }
    | { type: 'UPDATE_AFFILIATE_SCHEDULE'; payload: { affiliateId: string; schedule: Affiliate['schedule'] } }
    | { type: 'TOGGLE_TEMPORARY_CLOSED'; payload: { affiliate: Affiliate } }
    | { type: 'DELETE_AFFILIATE'; payload: { affiliateId: string } }
    | { type: 'ADD_INVENTORY_CHANGE'; payload: InventoryChange }
    | { type: 'RESOLVE_INVENTORY_CHANGE'; payload: { changeId: string; status: InventoryChangeStatus.Approved | InventoryChangeStatus.Rejected } }
    | { type: 'AFFILIATE_CONFIRM_INVENTORY_CHANGE'; payload: { change: InventoryChange } }
    | { type: 'CANCEL_INVENTORY_REQUEST'; payload: { changeId: string } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState> }
    | { type: 'LOAD_STATE' } // Kept for API compatibility, but functionally disabled
    | { type: 'SET_SUCCESS_MESSAGE'; payload: string }
    | { type: 'CLEAR_SUCCESS_MESSAGE' }
    | { type: 'UPDATE_AFFILIATE_BANK_DETAILS'; payload: { affiliateId: string; bankDetails: string } }
    | { type: 'PERFORM_CASHOUT'; payload: CashOut }
    | { type: 'AFFILIATE_CONFIRM_CASHOUT'; payload: { cashOutId: string } }
    // New action to set state from Firestore
    | { type: 'SET_STATE_FROM_FIRESTORE'; payload: Partial<AppState> };


// Create context
interface AppContextType {
    state: AppState;
    dispatch: Dispatch<Action>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

// Initial State
const initialState: AppState = {
    isAuthenticated: false,
    adminPassword: 'admin',
    adminPhoneNumber: '5512345678',
    affiliates: [],
    currentAffiliate: null,
    orders: [],
    users: [],
    referrals: [],
    coupons: [],
    inventoryChanges: [],
    cashOuts: [],
    bankDetails: 'Banco: XYZ\nCuenta: 1234567890\nCLABE: 098765432109876543\nTitular: Nombre Apellido',
    affiliateCommissionPerTortilla: DEFAULT_COMMISSION_PER_TORTILLA_CENTS,
    tortillaPrice: TORTILLA_PRICE,
    backupLoadCount: 0,
    successMessage: null,
    publicAppUrl: '',
    tabVisibility: {
        referrals: true,
        affiliates: true,
        coupons: true,
    },
};

// Reducer
const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        // AUTH ACTIONS (Local State)
        case 'LOGIN':
            return { ...state, isAuthenticated: true, adminPassword: action.payload };
        case 'LOGOUT':
            return { ...state, isAuthenticated: false };
        case 'AFFILIATE_LOGIN':
            return { ...state, currentAffiliate: action.payload, isAuthenticated: false };
        case 'AFFILIATE_LOGOUT':
            return { ...state, currentAffiliate: null };
        
        // FIRESTORE-DRIVEN STATE UPDATES
        case 'SET_STATE_FROM_FIRESTORE':
            return { ...state, ...action.payload };

        // ACTIONS THAT WRITE TO FIRESTORE
        case 'ADD_OR_UPDATE_USER':
            setDoc(doc(db, "users", action.payload.phone), action.payload, { merge: true });
            return state;
        
        case 'ADD_ORDER': {
            const { id, ...orderData } = action.payload;
            setDoc(doc(db, "orders", id), orderData);
            if (action.payload.couponUsed) {
                updateDoc(doc(db, "coupons", action.payload.couponUsed), { isUsed: true });
            }
            return state;
        }

        case 'UPDATE_ORDER_STATUS': {
            const { order, status } = action.payload;
            const orderRef = doc(db, "orders", order.id);
            updateDoc(orderRef, { status });

            if (status === OrderStatus.Finished) {
                const affiliateRef = doc(db, "affiliates", order.affiliateId);
                updateDoc(affiliateRef, { inventory: increment(-order.quantity) });
            }
            
            const referral = state.referrals.find(r => r.refereeOrderId === order.id);
            if(referral) {
                 let newStatus = referral.status;
                 if (status === OrderStatus.Cancelled) newStatus = ReferralStatus.Cancelled;
                 else if (status === OrderStatus.Active && referral.status === ReferralStatus.Cancelled) newStatus = ReferralStatus.ActiveOrder;
                 updateDoc(doc(db, "referrals", referral.id), { status: newStatus });
            }
            return state;
        }

        case 'CONFIRM_TRANSFER_PAYMENT':
            updateDoc(doc(db, "orders", action.payload.orderId), { status: OrderStatus.Active });
            return { ...state, successMessage: `Pago del pedido confirmado. El vendedor puede proceder.` };

        case 'ADD_REFERRAL': {
            const { id, ...referralData } = action.payload;
            setDoc(doc(db, "referrals", id), referralData);
            return state;
        }

        case 'COMPLETE_REFERRAL': {
            const { referral, couponCode } = action.payload;
            updateDoc(doc(db, "referrals", referral.id), { status: ReferralStatus.Completed });

            const newCoupon: Omit<Coupon, 'code'> & { code: string } = {
                code: couponCode,
                isUsed: false,
                rewardAmount: REWARD_TORTILLAS * state.tortillaPrice,
                generatedForPhone: referral.referrerPhone,
                isActive: true
            };
            setDoc(doc(db, "coupons", couponCode), newCoupon);
            return state;
        }

        case 'TOGGLE_COUPON_STATUS':
            updateDoc(doc(db, "coupons", action.payload.coupon.code), { isActive: !action.payload.coupon.isActive });
            return state;

        case 'DELETE_COUPON':
            deleteDoc(doc(db, "coupons", action.payload.couponCode));
            return { ...state, successMessage: `Cupón "${action.payload.couponCode}" eliminado.` };

        case 'APPLY_FOR_AFFILIATE': {
            const { id, ...affiliateData } = action.payload;
            setDoc(doc(db, "affiliates", id), affiliateData);
            return state;
        }

        case 'UPDATE_AFFILIATE_STATUS':
            updateDoc(doc(db, "affiliates", action.payload.affiliateId), { status: action.payload.status });
            return state;
        
        case 'TOGGLE_AFFILIATE_DELIVERY':
            updateDoc(doc(db, "affiliates", action.payload.affiliate.id), { hasDeliveryService: !action.payload.affiliate.hasDeliveryService });
            return state;

        case 'UPDATE_AFFILIATE_SETTINGS':
            updateDoc(doc(db, "affiliates", action.payload.affiliateId), {
                address: action.payload.address,
                deliveryCost: action.payload.deliveryCost
            });
            return state;

        case 'UPDATE_AFFILIATE_BANK_DETAILS':
            updateDoc(doc(db, "affiliates", action.payload.affiliateId), {
                bankDetails: action.payload.bankDetails
            });
            return state;

        case 'UPDATE_AFFILIATE_SCHEDULE':
             updateDoc(doc(db, "affiliates", action.payload.affiliateId), { schedule: action.payload.schedule });
            return state;

        case 'TOGGLE_TEMPORARY_CLOSED': {
            const { affiliate } = action.payload;
            updateDoc(doc(db, "affiliates", affiliate.id), { isTemporarilyClosed: !affiliate.isTemporarilyClosed });
            const message = !affiliate.isTemporarilyClosed ? 'Has cerrado tu tienda temporalmente.' : '¡Has abierto tu tienda! Ya puedes recibir pedidos.';
            return { ...state, successMessage: message };
        }
        
        case 'DELETE_AFFILIATE':
            deleteDoc(doc(db, "affiliates", action.payload.affiliateId));
            return { ...state, successMessage: `Vendedor eliminado con éxito.` };

        case 'ADD_INVENTORY_CHANGE': {
            const { id, ...changeData } = action.payload;
            setDoc(doc(db, "inventoryChanges", id), changeData);
            if (changeData.status !== InventoryChangeStatus.Pending) { // Admin adjustment
                 return { ...state, successMessage: 'Ajuste de inventario enviado para confirmación del vendedor.' };
            }
            return state;
        }
        
        case 'RESOLVE_INVENTORY_CHANGE':
            updateDoc(doc(db, "inventoryChanges", action.payload.changeId), { status: action.payload.status });
            return state;

        case 'AFFILIATE_CONFIRM_INVENTORY_CHANGE': {
            const { change } = action.payload;
            if (change.status !== InventoryChangeStatus.Approved) return state;

            updateDoc(doc(db, "inventoryChanges", change.id), { status: InventoryChangeStatus.Completed });
            updateDoc(doc(db, "affiliates", change.affiliateId), { inventory: increment(change.amount) });
            return { ...state, successMessage: 'Inventario confirmado y actualizado.' };
        }

        case 'CANCEL_INVENTORY_REQUEST':
            deleteDoc(doc(db, "inventoryChanges", action.payload.changeId));
            return { ...state, successMessage: 'Solicitud de inventario cancelada.' };
            
        case 'PERFORM_CASHOUT': {
            const { id, ...cashOutData } = action.payload;
            setDoc(doc(db, "cashOuts", id), cashOutData);

            const batch = writeBatch(db);
            cashOutData.ordersCoveredIds.forEach(orderId => {
                const orderRef = doc(db, "orders", orderId);
                batch.update(orderRef, { settledInCashOutId: id });
            });
            batch.commit();

            return { ...state, successMessage: 'Corte de caja realizado con éxito.' };
        }
        
        case 'AFFILIATE_CONFIRM_CASHOUT':
            updateDoc(doc(db, "cashOuts", action.payload.cashOutId), { status: CashOutStatus.Completed });
             return { ...state, successMessage: 'Recepción de transferencia confirmada.' };

        case 'UPDATE_SETTINGS':
            setDoc(doc(db, "settings", "main"), action.payload, { merge: true });
            return state;

        // UI-ONLY ACTIONS
        case 'SET_SUCCESS_MESSAGE':
            return { ...state, successMessage: action.payload };
        case 'CLEAR_SUCCESS_MESSAGE':
            return { ...state, successMessage: null };
            
        case 'LOAD_STATE': {
             alert("La restauración desde un archivo está deshabilitada al usar la base de datos en la nube para prevenir la sobreescritura de datos.");
             return state;
        }

        default:
            return state;
    }
};

// Provider Component
const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    useEffect(() => {
        console.log("Setting up Firestore listeners...");

        const processSnapshot = (snapshot: any, key: keyof AppState) => {
            const data = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }));
            dispatch({ type: 'SET_STATE_FROM_FIRESTORE', payload: { [key]: data } });
        };
        
        const unsubs = [
            onSnapshot(collection(db, 'affiliates'), (snap) => processSnapshot(snap, 'affiliates')),
            onSnapshot(collection(db, 'orders'), (snap) => processSnapshot(snap, 'orders')),
            onSnapshot(collection(db, 'users'), (snap) => processSnapshot(snap, 'users')),
            onSnapshot(collection(db, 'referrals'), (snap) => processSnapshot(snap, 'referrals')),
            onSnapshot(collection(db, 'coupons'), (snap) => processSnapshot(snap, 'coupons')),
            onSnapshot(collection(db, 'inventoryChanges'), (snap) => processSnapshot(snap, 'inventoryChanges')),
            onSnapshot(collection(db, 'cashOuts'), (snap) => processSnapshot(snap, 'cashOuts')),
            onSnapshot(doc(db, "settings", "main"), (doc) => {
                if (doc.exists()) {
                    dispatch({ type: 'SET_STATE_FROM_FIRESTORE', payload: doc.data() });
                } else {
                    // Initialize settings if they don't exist
                    setDoc(doc(db, "settings", "main"), {
                        adminPassword: initialState.adminPassword,
                        adminPhoneNumber: initialState.adminPhoneNumber,
                        bankDetails: initialState.bankDetails,
                        affiliateCommissionPerTortilla: initialState.affiliateCommissionPerTortilla,
                        publicAppUrl: initialState.publicAppUrl,
                        tortillaPrice: initialState.tortillaPrice,
                        tabVisibility: initialState.tabVisibility,
                    });
                }
            })
        ];

        return () => {
            console.log("Cleaning up Firestore listeners.");
            unsubs.forEach(unsub => unsub());
        };
    }, []);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export { AppProvider };