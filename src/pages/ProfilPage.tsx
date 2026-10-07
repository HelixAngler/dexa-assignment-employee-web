const strings = {
  heading: 'Profil Saya',
};

export default function ProfilPage() {
  return (
    <section data-testid="profil">
      <h1 className="text-2xl font-semibold">{strings.heading}</h1>
    </section>
  );
}
