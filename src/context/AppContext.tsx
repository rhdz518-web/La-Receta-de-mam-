import React, { createContext, useReducer, useEffect, Dispatch, ReactNode } from 'react';
import { AppState, Order, Affiliate, InventoryChange, OrderStatus, AffiliateStatus, InventoryChangeStatus, Referral, Coupon, ReferralStatus, User, CashOut, CashOutStatus } from '../types.ts';
import { DEFAULT_COMMISSION_PER_TORTILLA_CENTS, REWARD_TORTILLAS, APP_VERSION, TORTILLA_PRICE } from '../constants.ts';

// Define action types
type Action =
    | { type: 'LOGIN'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'AFFILIATE_LOGIN'; payload: Affiliate }
    | { type: 'AFFILIATE_LOGOUT' }
    | { type: 'ADD_OR_UPDATE_USER'; payload: User }
    | { type: 'ADD_ORDER'; payload: Order }
    | { type: 'UPDATE_ORDER_STATUS'; payload: { orderId: string; status: OrderStatus } }
    | { type: 'CONFIRM_TRANSFER_PAYMENT'; payload: { orderId: string } }
    | { type: 'ADD_REFERRAL'; payload: Referral }
    | { type: 'COMPLETE_REFERRAL'; payload: { referralId: string; couponCode: string } }
    | { type: 'TOGGLE_COUPON_STATUS'; payload: { couponCode: string } }
    | { type: 'DELETE_COUPON'; payload: { couponCode: string } }
    | { type: 'APPLY_FOR_AFFILIATE'; payload: Affiliate }
    | { type: 'UPDATE_AFFILIATE_STATUS'; payload: { affiliateId: string; status: AffiliateStatus } }
    | { type: 'TOGGLE_AFFILIATE_DELIVERY'; payload: { affiliateId: string } }
    | { type: 'UPDATE_AFFILIATE_SETTINGS'; payload: { affiliateId: string; address: string; deliveryCost: number } }
    | { type: 'UPDATE_AFFILIATE_SCHEDULE'; payload: { affiliateId: string; schedule: Affiliate['schedule'] } }
    | { type: 'TOGGLE_TEMPORARY_CLOSED'; payload: { affiliateId: string } }
    | { type: 'DELETE_AFFILIATE'; payload: { affiliateId: string } }
    | { type: 'ADD_INVENTORY_CHANGE'; payload: InventoryChange }
    | { type: 'RESOLVE_INVENTORY_CHANGE'; payload: { changeId: string; status: InventoryChangeStatus.Approved | InventoryChangeStatus.Rejected } }
    | { type: 'AFFILIATE_CONFIRM_INVENTORY_CHANGE'; payload: { changeId: string } }
    | { type: 'CANCEL_INVENTORY_REQUEST'; payload: { changeId: string } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState> }
    | { type: 'LOAD_STATE'; payload: AppState }
    | { type: 'SET_SUCCESS_MESSAGE'; payload: string }
    | { type: 'CLEAR_SUCCESS_MESSAGE' }
    | { type: 'UPDATE_AFFILIATE_BANK_DETAILS'; payload: { affiliateId: string; bankDetails: string } }
    | { type: 'PERFORM_CASHOUT'; payload: CashOut }
    | { type: 'AFFILIATE_CONFIRM_CASHOUT'; payload: { cashOutId: string } };

// Create context
interface AppContextType {
    state: AppState;
    dispatch: Dispatch<Action>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

// Initial State
const initialState: AppState = {
    isAuthenticated: false,
    adminPassword: 'admin', // Default password
    adminPhoneNumber: '5512345678', // Default admin phone number for notifications
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


// --- MIGRATION LOGIC ---
// This function will be run on any loaded state to ensure data consistency
const runMigrations = (state: AppState): AppState => {
    // Migration: Ensure affiliateName exists on all orders
    if (state.orders && state.affiliates) {
        const affiliateMap = new Map(state.affiliates.map(a => [a.id, a.customerName]));
        state.orders = state.orders.map(order => {
            if (!order.affiliateName && affiliateMap.has(order.affiliateId)) {
                return {
                    ...order,
                    affiliateName: affiliateMap.get(order.affiliateId)!
                };
            }
            return order;
        });
    }

    const defaultSchedule = {
        monday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        tuesday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        wednesday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        thursday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        friday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        saturday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
    };

    // Migration: Ensure schedule, isTemporarilyClosed and bankDetails exist on affiliates
    if (state.affiliates) {
        state.affiliates = state.affiliates.map(affiliate => {
            const hasDelivery = typeof affiliate.hasDeliveryService !== 'undefined' ? affiliate.hasDeliveryService : false;
            const deliveryCost = typeof affiliate.deliveryCost !== 'undefined' ? affiliate.deliveryCost : 0;
            const schedule = affiliate.schedule || defaultSchedule;
            const isTemporarilyClosed = typeof affiliate.isTemporarilyClosed !== 'undefined' ? affiliate.isTemporarilyClosed : false;
            
            return {
                ...affiliate,
                hasDeliveryService: hasDelivery,
                deliveryCost: deliveryCost,
                schedule,
                isTemporarilyClosed,
                bankDetails: affiliate.bankDetails || '',
            };
        });
    }
    
    // Migration: Ensure tortillaPrice exists for backwards compatibility
    if (typeof state.tortillaPrice === 'undefined') {
        state.tortillaPrice = TORTILLA_PRICE;
    }

    // Migration: Ensure deliveryFeeApplied, deliveryChoice, settledInCashOutId, and isLowInventoryOrder exist on orders
    if (state.orders) {
        state.orders = state.orders.map(order => {
             if (typeof order.deliveryFeeApplied === 'undefined') {
                order.deliveryFeeApplied = 0;
             }
             if (typeof order.deliveryChoice === 'undefined') {
                order.deliveryChoice = 'delivery'; // Assume old orders were all delivery
             }
             if (typeof order.paymentReceiptImage === 'undefined') {
                order.paymentReceiptImage = undefined;
             }
             if (typeof order.settledInCashOutId === 'undefined') {
                 order.settledInCashOutId = null;
             }
             if (typeof order.isLowInventoryOrder === 'undefined') {
                order.isLowInventoryOrder = false;
             }
             return order;
        });
    }

    // Migration: Ensure tabVisibility exists
    if (!state.tabVisibility) {
        state.tabVisibility = {
            referrals: true,
            affiliates: true,
            coupons: true,
        };
    }

    // Migration: Ensure cashOuts array exists
    if (!state.cashOuts) {
        state.cashOuts = [];
    }
    
    // Migration: Ensure totalDeliveryFees exists on cashOuts
    if (state.cashOuts && state.orders) {
        state.cashOuts = state.cashOuts.map(co => {
            if (co.totalDeliveryFees !== undefined) return co;
            const coveredOrders = state.orders.filter(o => co.ordersCoveredIds.includes(o.id));
            const totalDeliveryFees = coveredOrders.reduce((sum, order) => sum + (order.deliveryFeeApplied || 0), 0);
            return { ...co, totalDeliveryFees };
        });
    }

    // Migration: Ensure adminPhoneNumber exists
    if (!state.adminPhoneNumber) {
        state.adminPhoneNumber = '5512345678'; // Default placeholder
    }

    return state;
};


// Reducer
const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'LOGIN':
            return {
                ...state,
                isAuthenticated: true,
                adminPassword: action.payload,
            };
        case 'LOGOUT':
            return {
                ...state,
                isAuthenticated: false,
            };
        case 'AFFILIATE_LOGIN':
            return {
                ...state,
                currentAffiliate: action.payload,
            };
        case 'AFFILIATE_LOGOUT':
            return {
                ...state,
                currentAffiliate: null,
            };
        case 'ADD_OR_UPDATE_USER': {
            const existingUserIndex = state.users.findIndex(u => u.phone === action.payload.phone);
            if (existingUserIndex > -1) {
                const updatedUsers = [...state.users];
                updatedUsers[existingUserIndex] = action.payload;
                return { ...state, users: updatedUsers };
            }
            return { ...state, users: [...state.users, action.payload] };
        }
        case 'ADD_ORDER': {
            const newOrders = [...state.orders, action.payload];
            let newCoupons = [...state.coupons];
            if (action.payload.couponUsed) {
                const couponIndex = newCoupons.findIndex(c => c.code === action.payload.couponUsed);
                if (couponIndex > -1) {
                    newCoupons[couponIndex] = { ...newCoupons[couponIndex], isUsed: true };
                }
            }
            return { ...state, orders: newOrders, coupons: newCoupons };
        }
        case 'UPDATE_ORDER_STATUS': {
            const orderIndex = state.orders.findIndex(o => o.id === action.payload.orderId);
            if (orderIndex === -1) return state;

            const updatedOrder = { ...state.orders[orderIndex], status: action.payload.status };
            const newOrders = [...state.orders];
            newOrders[orderIndex] = updatedOrder;

            let newAffiliates = [...state.affiliates];
            // If the order is marked as 'Finished', deduct the quantity from the affiliate's inventory.
            if (action.payload.status === OrderStatus.Finished) {
                const affiliateIndex = newAffiliates.findIndex(a => a.id === updatedOrder.affiliateId);
                if (affiliateIndex > -1) {
                    const affiliate = newAffiliates[affiliateIndex];
                    newAffiliates[affiliateIndex] = {
                        ...affiliate,
                        inventory: affiliate.inventory - updatedOrder.quantity,
                    };
                }
            }

            const referral = state.referrals.find(r => r.refereeOrderId === action.payload.orderId);
            let newReferrals = [...state.referrals];
            if (referral) {
                const referralIndex = newReferrals.findIndex(r => r.id === referral.id);
                if (referralIndex > -1) {
                    let newStatus = referral.status;
                    if (action.payload.status === OrderStatus.Cancelled) {
                        newStatus = ReferralStatus.Cancelled;
                    } else if (action.payload.status === OrderStatus.Active && referral.status === ReferralStatus.Cancelled) {
                        newStatus = ReferralStatus.ActiveOrder;
                    }
                    newReferrals[referralIndex] = { ...newReferrals[referralIndex], status: newStatus };
                }
            }

            return { ...state, orders: newOrders, referrals: newReferrals, affiliates: newAffiliates };
        }
        case 'CONFIRM_TRANSFER_PAYMENT': {
            const orderIndex = state.orders.findIndex(o => o.id === action.payload.orderId);
            if (orderIndex === -1) return state;

            const updatedOrder = { ...state.orders[orderIndex], status: OrderStatus.Active };
            const newOrders = [...state.orders];
            newOrders[orderIndex] = updatedOrder;

            return { 
                ...state, 
                orders: newOrders,
                successMessage: `Pago del pedido confirmado. El vendedor puede proceder.` 
            };
        }
        case 'ADD_REFERRAL':
            return {
                ...state,
                referrals: [...state.referrals, action.payload],
            };
        case 'COMPLETE_REFERRAL': {
            const referralIndex = state.referrals.findIndex(r => r.id === action.payload.referralId);
            if (referralIndex === -1) return state;

            const newReferrals = [...state.referrals];
            newReferrals[referralIndex] = { ...newReferrals[referralIndex], status: ReferralStatus.Completed };

            const newCoupon: Coupon = {
                code: action.payload.couponCode,
                isUsed: false,
                rewardAmount: REWARD_TORTILLAS * state.tortillaPrice,
                generatedForPhone: newReferrals[referralIndex].referrerPhone,
                isActive: true
            };
            return {
                ...state,
                referrals: newReferrals,
                coupons: [...state.coupons, newCoupon],
            };
        }
        case 'TOGGLE_COUPON_STATUS': {
            const couponIndex = state.coupons.findIndex(c => c.code === action.payload.couponCode);
            if (couponIndex === -1) return state;
            
            const newCoupons = [...state.coupons];
            const coupon = newCoupons[couponIndex];
            newCoupons[couponIndex] = {...coupon, isActive: !coupon.isActive};
            
            return { ...state, coupons: newCoupons };
        }
        case 'DELETE_COUPON': {
            const updatedCoupons = state.coupons.filter(c => c.code !== action.payload.couponCode);
            return {
                ...state,
                coupons: updatedCoupons,
                successMessage: `Cupón "${action.payload.couponCode}" eliminado con éxito.`,
            };
        }
        case 'APPLY_FOR_AFFILIATE':
            return {
                ...state,
                affiliates: [...state.affiliates, action.payload],
            };
        case 'UPDATE_AFFILIATE_STATUS': {
            const affiliateIndex = state.affiliates.findIndex(a => a.id === action.payload.affiliateId);
            if (affiliateIndex === -1) return state;
            
            const newAffiliates = [...state.affiliates];
            newAffiliates[affiliateIndex] = { ...newAffiliates[affiliateIndex], status: action.payload.status };
            
            return { ...state, affiliates: newAffiliates };
        }
        case 'TOGGLE_AFFILIATE_DELIVERY': {
            const affiliateIndex = state.affiliates.findIndex(a => a.id === action.payload.affiliateId);
            if (affiliateIndex === -1) return state;

            const newAffiliates = [...state.affiliates];
            const affiliate = newAffiliates[affiliateIndex];
            newAffiliates[affiliateIndex] = { ...affiliate, hasDeliveryService: !affiliate.hasDeliveryService };

            return { ...state, affiliates: newAffiliates };
        }
        case 'UPDATE_AFFILIATE_SETTINGS': {
            const affiliateIndex = state.affiliates.findIndex(a => a.id === action.payload.affiliateId);
            if (affiliateIndex === -1) return state;

            const newAffiliates = [...state.affiliates];
            const affiliate = newAffiliates[affiliateIndex];
            newAffiliates[affiliateIndex] = { 
                ...affiliate, 
                address: action.payload.address,
                deliveryCost: action.payload.deliveryCost,
            };

            return { ...state, affiliates: newAffiliates };
        }
         case 'UPDATE_AFFILIATE_BANK_DETAILS': {
            const affiliateIndex = state.affiliates.findIndex(a => a.id === action.payload.affiliateId);
            if (affiliateIndex === -1) return state;

            const newAffiliates = [...state.affiliates];
            const affiliate = newAffiliates[affiliateIndex];
            newAffiliates[affiliateIndex] = { 
                ...affiliate, 
                bankDetails: action.payload.bankDetails,
            };

            return { ...state, affiliates: newAffiliates };
        }
        case 'UPDATE_AFFILIATE_SCHEDULE': {
            const affiliateIndex = state.affiliates.findIndex(a => a.id === action.payload.affiliateId);
            if (affiliateIndex === -1) return state;

            const newAffiliates = [...state.affiliates];
            const affiliate = newAffiliates[affiliateIndex];
            newAffiliates[affiliateIndex] = { ...affiliate, schedule: action.payload.schedule };

            return { ...state, affiliates: newAffiliates };
        }
        case 'TOGGLE_TEMPORARY_CLOSED': {
            const affiliateIndex = state.affiliates.findIndex(a => a.id === action.payload.affiliateId);
            if (affiliateIndex === -1) return state;

            const newAffiliates = [...state.affiliates];
            const affiliate = newAffiliates[affiliateIndex];
            newAffiliates[affiliateIndex] = { ...affiliate, isTemporarilyClosed: !affiliate.isTemporarilyClosed };
            
            const message = !affiliate.isTemporarilyClosed 
                ? 'Has cerrado tu tienda temporalmente.'
                : '¡Has abierto tu tienda! Ya puedes recibir pedidos.';

            return { ...state, affiliates: newAffiliates, successMessage: message };
        }
        case 'DELETE_AFFILIATE': {
            const affiliateToDelete = state.affiliates.find(a => a.id === action.payload.affiliateId);
            if (!affiliateToDelete) return state; // Affiliate not found, do nothing.

            // Create a new orders array, preserving the name of the deleted affiliate on their past orders.
            const updatedOrders = state.orders.map(order => {
                if (order.affiliateId === action.payload.affiliateId) {
                    return { ...order, affiliateName: affiliateToDelete.customerName };
                }
                return order;
            });

            // Create a new affiliates array without the deleted one.
            const updatedAffiliates = state.affiliates.filter(a => a.id !== action.payload.affiliateId);

            return {
                ...state,
                affiliates: updatedAffiliates,
                orders: updatedOrders,
                successMessage: `Vendedor "${affiliateToDelete.customerName}" eliminado con éxito.`,
            };
        }
        case 'ADD_INVENTORY_CHANGE':
            return {
                ...state,
                inventoryChanges: [...state.inventoryChanges, action.payload],
            };
        case 'RESOLVE_INVENTORY_CHANGE': {
            const changeIndex = state.inventoryChanges.findIndex(c => c.id === action.payload.changeId);
            if (changeIndex === -1) return state;

            const change = state.inventoryChanges[changeIndex];
            const newChanges = [...state.inventoryChanges];
            newChanges[changeIndex] = { ...change, status: action.payload.status };

            // Inventory is no longer updated here. It's updated on affiliate confirmation.
            return { ...state, inventoryChanges: newChanges };
        }
        case 'AFFILIATE_CONFIRM_INVENTORY_CHANGE': {
            const changeIndex = state.inventoryChanges.findIndex(c => c.id === action.payload.changeId);
            if (changeIndex === -1) return state;

            const change = state.inventoryChanges[changeIndex];
            // Only 'Approved' changes can be confirmed
            if (change.status !== InventoryChangeStatus.Approved) return state;

            const newChanges = [...state.inventoryChanges];
            newChanges[changeIndex] = { ...change, status: InventoryChangeStatus.Completed };

            let newAffiliates = [...state.affiliates];
            let updatedAffiliate: Affiliate | null = null;
            const affiliateIndex = newAffiliates.findIndex(a => a.id === change.affiliateId);
            if (affiliateIndex > -1) {
                const affiliate = newAffiliates[affiliateIndex];
                updatedAffiliate = { ...affiliate, inventory: affiliate.inventory + change.amount };
                newAffiliates[affiliateIndex] = updatedAffiliate;
            }

            let newOrders = [...state.orders];
            if (updatedAffiliate) {
                newOrders = newOrders.map(order => {
                    if (order.affiliateId === updatedAffiliate!.id && order.isLowInventoryOrder && order.quantity <= updatedAffiliate!.inventory) {
                        return { ...order, isLowInventoryOrder: false };
                    }
                    return order;
                });
            }

            return { 
                ...state, 
                inventoryChanges: newChanges, 
                affiliates: newAffiliates,
                orders: newOrders,
                successMessage: 'Inventario confirmado y actualizado con éxito.'
            };
        }
        case 'CANCEL_INVENTORY_REQUEST': {
            const changeIndex = state.inventoryChanges.findIndex(
                (c) => c.id === action.payload.changeId
            );
        
            if (changeIndex < 0) {
                return state; // not found
            }
            
            const requestToCancel = state.inventoryChanges[changeIndex];
            if (requestToCancel.status !== InventoryChangeStatus.Pending) {
                return state; // not in cancellable state
            }
        
            const updatedChanges = [...state.inventoryChanges];
            updatedChanges.splice(changeIndex, 1);
        
            return {
                ...state,
                inventoryChanges: updatedChanges,
                successMessage: 'Solicitud de inventario cancelada.'
            };
        }
        case 'PERFORM_CASHOUT': {
            const newCashOut = action.payload;
            const updatedOrders = state.orders.map(order => {
                if (newCashOut.ordersCoveredIds.includes(order.id)) {
                    return { ...order, settledInCashOutId: newCashOut.id };
                }
                return order;
            });
            return {
                ...state,
                cashOuts: [...state.cashOuts, newCashOut],
                orders: updatedOrders,
                successMessage: 'Corte de caja realizado con éxito.',
            };
        }
        case 'AFFILIATE_CONFIRM_CASHOUT': {
            const cashOutIndex = state.cashOuts.findIndex(co => co.id === action.payload.cashOutId);
            if (cashOutIndex === -1) return state;

            const updatedCashOuts = [...state.cashOuts];
            updatedCashOuts[cashOutIndex] = {
                ...updatedCashOuts[cashOutIndex],
                status: CashOutStatus.Completed,
            };
            return {
                ...state,
                cashOuts: updatedCashOuts,
                successMessage: 'Recepción de transferencia confirmada.',
            };
        }
        case 'UPDATE_SETTINGS':
            return {
                ...state,
                ...action.payload,
            };
        case 'LOAD_STATE': {
            let loadedState = action.payload;
            // Run migrations on the loaded state to ensure data consistency
            loadedState = runMigrations(loadedState);

            return {
                ...loadedState,
                isAuthenticated: false,
                currentAffiliate: null,
                backupLoadCount: state.backupLoadCount + 1,
                successMessage: 'Copia de seguridad cargada exitosamente. Por favor, inicia sesión de nuevo.'
            };
        }
        case 'SET_SUCCESS_MESSAGE':
            return { ...state, successMessage: action.payload };
        case 'CLEAR_SUCCESS_MESSAGE':
            return { ...state, successMessage: null };
        default:
            return state;
    }
};

// Provider Component
const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState, () => {
        try {
            const localData = localStorage.getItem('tortilleria-app-state');
            if (localData) {
                let parsedData = JSON.parse(localData);
                if(parsedData.version !== APP_VERSION) {
                    console.log(`State version mismatch. Found ${parsedData.version}, expected ${APP_VERSION}. Resetting state.`);
                    localStorage.removeItem('tortilleria-app-state');
                    return initialState;
                }
                
                // Run migrations on the data from localStorage
                parsedData = runMigrations(parsedData);
                
                // Always start logged out
                parsedData.isAuthenticated = false;
                parsedData.currentAffiliate = null;
                
                delete parsedData.version;

                return { ...initialState, ...parsedData };
            }
            return initialState;
        } catch (error) {
            console.error("Could not load state from localStorage", error);
            return initialState;
        }
    });

    useEffect(() => {
        try {
            // Create a deep copy to avoid mutating the live state.
            const stateToSave: AppState = JSON.parse(JSON.stringify(state));

            // Optimize storage by removing image data from completed records.
            // This prevents localStorage from exceeding its quota.
            stateToSave.orders = stateToSave.orders.map(order => {
                if (order.status === OrderStatus.Finished || order.status === OrderStatus.Cancelled) {
                    const { paymentReceiptImage, ...orderWithoutImage } = order;
                    return orderWithoutImage as Order;
                }
                return order;
            });

            stateToSave.cashOuts = stateToSave.cashOuts.map(cashOut => {
                if (cashOut.status === CashOutStatus.Completed) {
                    const { adminPaymentReceiptImage, ...cashOutWithoutImage } = cashOut;
                    return cashOutWithoutImage as CashOut;
                }
                return cashOut;
            });

            const finalStateToSave: any = { ...stateToSave };
            finalStateToSave.version = APP_VERSION;
            
            // Do not persist auth state
            delete finalStateToSave.isAuthenticated;
            delete finalStateToSave.currentAffiliate;

            localStorage.setItem('tortilleria-app-state', JSON.stringify(finalStateToSave));
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export { AppProvider };