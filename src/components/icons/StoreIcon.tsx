import React from 'react';

const StoreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5A.75.75 0 0114.25 12h.01a.75.75 0 01.75.75v7.5m-3.75 0v-7.5a.75.75 0 00-.75-.75h-.01a.75.75 0 00-.75.75v7.5m-3.75 0v-7.5a.75.75 0 00-.75-.75h-.01a.75.75 0 00-.75.75v7.5m-3.75 0V12A2.25 2.25 0 015.25 9.75h13.5A2.25 2.25 0 0121 12v9m-18 0h18M5.25 9.75L4.5 3.75m15 6L19.5 3.75m-15 6h15" />
  </svg>
);

export default StoreIcon;