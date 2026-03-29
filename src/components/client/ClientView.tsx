import React from 'react';

interface ClientViewProps {
  planData?: any;
  regData?: any;
}

export const ClientView: React.FC<ClientViewProps> = ({ planData, regData }) => {
  // Update property access to fix errors
  const updatedPlan = planData?.datos?.P;
  const updatedLogs = regData?.datos?.logs;

  return (
    <div>
      <h1>Client View</h1>
      <p>Plan: {updatedPlan}</p>
      <p>Logs: {updatedLogs}</p>
    </div>
  );
};

export default ClientView;
