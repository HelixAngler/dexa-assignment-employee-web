const strings = {
  heading: 'Summary Kehadiran',
};

export default function SummaryPage() {
  return (
    <section data-testid="summary">
      <h1 className="text-2xl font-semibold">{strings.heading}</h1>
    </section>
  );
}
