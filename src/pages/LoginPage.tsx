const strings = {
  heading: 'Masuk',
};

export default function LoginPage() {
  return (
    <section data-testid="login" className="flex min-h-[60vh] items-center justify-center">
      <h1 className="text-2xl font-semibold">{strings.heading}</h1>
    </section>
  );
}
