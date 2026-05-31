import MobileCalculator from "@/components/MobileCalculator";

export const metadata = {
  title: "AiRO Rentabilitaetsrechner",
  description: "Mobile AiRO ROI-Rechner",
};

export default function MobilePage() {
  return (
    <div style={{ background: "#0d0d0d", minHeight: "100dvh" }}>
      <MobileCalculator />
    </div>
  );
}
