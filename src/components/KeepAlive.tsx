import React, { useEffect } from 'react';

/**
 * KeepAlive component pings the server periodically to prevent the 
 * development container from idling out while the user has the app open.
 */
const KeepAlive: React.FC = () => {
  useEffect(() => {
    const pingServer = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          console.log('Keep-alive ping successful');
        }
      } catch (error) {
        console.error('Keep-alive ping failed:', error);
      }
    };

    // Ping every 2 minutes (120000 ms)
    const interval = setInterval(pingServer, 120000);
    
    // Initial ping
    pingServer();

    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything
};

export default KeepAlive;
