import { useAuth } from '@/auth/AuthContext';
import { AuthForm } from '@/components/AuthForm';

export default function LoginScreen() {
  const { login } = useAuth();
  return (
    <AuthForm
      title="Welcome to ChatExpo"
      submitLabel="Log in"
      onSubmit={login}
      switchText="No account yet? Sign up"
      switchHref="/register"
    />
  );
}
