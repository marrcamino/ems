export function getPasswordStrengthError(pw: string): string {
  if (!pw) return "Password is required";
  if (pw.length < 8) return "Must be at least 8 characters";
  if (!/[a-z]/.test(pw)) return "Include at least one lowercase letter";
  if (!/[A-Z]/.test(pw)) return "Include at least one uppercase letter";
  if (!/[0-9]/.test(pw)) return "Include at least one number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Include at least one special character";
  return "";
}
