import CheckoutIntentRunner from '@/components/billing/CheckoutIntentRunner';

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <CheckoutIntentRunner />
            {children}
        </>
    );
}
