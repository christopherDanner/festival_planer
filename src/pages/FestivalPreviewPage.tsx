import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import FestivalPreview from "@/components/FestivalPreview";
import FestivalWizard from "@/components/FestivalWizard";

export default function FestivalPreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  
  const festivalData = location.state?.festivalData;

  useEffect(() => {
    if (!festivalData) {
      navigate('/dashboard');
    }
  }, [festivalData, navigate]);

  if (!festivalData) {
    return null;
  }

  if (showWizard) {
    return (
      <FestivalWizard 
        onClose={() => navigate('/dashboard')}
        onComplete={() => setShowWizard(false)}
      />
    );
  }

  return (
    <FestivalPreview 
      festivalData={festivalData}
      onBack={() => setShowWizard(true)}
    />
  );
}