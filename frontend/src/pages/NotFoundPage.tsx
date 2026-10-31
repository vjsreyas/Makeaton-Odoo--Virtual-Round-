import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';

export function NotFoundPage() {
  return (
    <AuthLayout
      title="Page not found"
      subtitle="The page you are looking for does not exist."
      footer={<Link to="/" className="font-semibold hover:text-slate-800">Go to your home page</Link>}
    >
      <span />
    </AuthLayout>
  );
}
