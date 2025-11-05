import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 transition-all hover:shadow-lg hover:scale-105">
      <div className="bg-brand-primary/20 text-brand-secondary p-4 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-brand-dark">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
