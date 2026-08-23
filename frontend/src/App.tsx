import { useEffect, useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('Hello World!');

  useEffect(() => {
    fetch('/api')
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then(setMessage)
      .catch(() => setMessage('Hello World!'));
  }, []);

  return (
    <main>
      <h1>{message}</h1>
      <p>React + NestJS + MariaDB</p>
    </main>
  );
}
