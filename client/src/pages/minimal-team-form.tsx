// Absolute minimal team form component - no dependencies
export default function MinimalTeamForm() {
  console.log('MinimalTeamForm - Component rendered');
  console.log('MinimalTeamForm - Current location:', window.location.href);
  console.log('MinimalTeamForm - Pathname:', window.location.pathname);
  
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#ff0000',
      color: 'white',
      fontSize: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      zIndex: 9999
    }}>
      <h1>TEAM FORM WORKING!</h1>
      <p>URL: {window.location.href}</p>
      <p>This red screen means the team form is loading</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}