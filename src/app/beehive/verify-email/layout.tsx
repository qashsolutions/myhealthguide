// Force dynamic rendering for all verify-email pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}