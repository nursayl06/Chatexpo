import { useAuth } from '@/auth/AuthContext';
import { AuthForm } from '@/components/AuthForm';

export default function RegisterScreen() {
  const { register } = useAuth();
  return (
    <AuthForm
      title="Create an account"
      submitLabel="Sign up"
      onSubmit={register}
      switchText="Already have an account? Log in"
      switchHref="/login"
    />
  );
}
