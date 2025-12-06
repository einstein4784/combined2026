"use client";

export function PrintButton() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button className="btn btn-primary" onClick={handlePrint}>
      Print / PDF
    </button>
  );
}

