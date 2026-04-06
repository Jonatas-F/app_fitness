import { createBrowserRouter } from 'react-router-dom';

function HomePage() {
  return <h1>Shape Certo</h1>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
]);