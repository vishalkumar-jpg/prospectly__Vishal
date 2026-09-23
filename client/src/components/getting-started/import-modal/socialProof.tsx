interface ImportModalSocialProofProps {
  text: string;
}

export function ImportModalSocialProof({
  text,
}: ImportModalSocialProofProps) {
  return (
    <div className="mt-2 text-center text-[11px] text-muted-foreground">
      {text}
    </div>
  );
}
