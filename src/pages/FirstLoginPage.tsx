const strings = {
  heading: 'Login Pertama',
};

export default function FirstLoginPage() {
  return (
    <section
      data-testid="first-login"
      className="flex min-h-[60vh] items-center justify-center"
    >
      <h1 className="text-2xl font-semibold">{strings.heading}</h1>
    </section>
  );
}
