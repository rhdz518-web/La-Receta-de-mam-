import React from 'react';

const TicketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h.75M9 15h.75M9 12h.75M9 9h.75M12 9h.75M12 12h.75M12 15h.75M12 18h.75M15 18h.75M15 15h.75M15 12h.75M15 9h.75M9 18v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V18M9 3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V5.25M9 5.25h2.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V6.75z" />
  </svg>
);

export default TicketIcon;
