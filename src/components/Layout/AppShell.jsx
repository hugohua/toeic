import React from 'react';

/**
 * AppShell
 * The main container for the application.
 * Simulates a mobile device viewport on desktop and handles full width/height on mobile.
 */
export const AppShell = ({ children }) => {
    return (
        <div className="app-shell">
            {children}
        </div>
    );
};
