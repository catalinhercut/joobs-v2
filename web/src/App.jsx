import React from "react";

export const App = () => {
  const [ping, setPing] = React.useState(null);

  React.useEffect(() => {
    const call = async () => {
      const base = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${base}/health`);
      setPing({ status: res.status, at: new Date().toISOString() });
    };
    call().catch(console.error);
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>Vite + React</h1>
      <p>API base: {import.meta.env.VITE_API_BASE_URL}</p>
      <pre>{JSON.stringify(ping, null, 2)}</pre>
    </main>
  );
};

export default App;
