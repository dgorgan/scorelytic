import { useState } from 'react';
import {
  ReviewSummary,
  BiasDetail,
  CulturalContext,
  FullBiasReport,
} from '@/shared/types/biasReport';

type BiasReport = {
  summary: ReviewSummary;
  details: BiasDetail[];
  culturalContext: CulturalContext;
  fullReport: FullBiasReport;
};

type Props = { report: BiasReport };

const Section = ({
  title,
  open,
  onClick,
  children,
}: {
  title: string;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <div className="mb-4 border rounded shadow">
    <button className="w-full text-left px-4 py-2 bg-gray-100 font-semibold" onClick={onClick}>
      {title}
    </button>
    {open && <div className="p-4 bg-white">{children}</div>}
  </div>
);

const BiasReportViewer = ({ report }: Props) => {
  const [open, setOpen] = useState({
    summary: true,
    details: false,
    context: false,
    full: false,
  });

  return (
    <div>
      <Section
        title="Summary"
        open={open.summary}
        onClick={() => setOpen((o) => ({ ...o, summary: !o.summary }))}
      >
        <div>
          Score: <b>{report.summary.adjustedScore}</b>
        </div>
        <div>Verdict: {report.summary.verdict}</div>
        <div>Confidence: {report.summary.confidence}</div>
        <div>Recommendation: {report.summary.recommendationStrength}</div>
        {report.summary.biasSummary && <div>Biases: {report.summary.biasSummary}</div>}
      </Section>
      <Section
        title="Bias Details"
        open={open.details}
        onClick={() => setOpen((o) => ({ ...o, details: !o.details }))}
      >
        {report.details.length === 0 ? (
          <div>No significant biases detected.</div>
        ) : (
          <ul className="list-disc ml-6">
            {report.details.map((b, i) => (
              <li key={i} className="mb-2">
                <b>{b.name}</b> ({b.severity}) — Impact: {b.scoreImpact} <br />
                <span className="text-gray-600">{b.impactOnExperience}</span>
                {b.description && <div className="text-xs text-gray-500">{b.description}</div>}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section
        title="Cultural Context"
        open={open.context}
        onClick={() => setOpen((o) => ({ ...o, context: !o.context }))}
      >
        <div>Original Score: {report.culturalContext.originalScore}</div>
        <div>Bias-Adjusted Score: {report.culturalContext.biasAdjustedScore}</div>
        <div>Justification: {report.culturalContext.justification}</div>
        <div>Audience Reaction:</div>
        <ul className="ml-6">
          <li>Aligned: {report.culturalContext.audienceReaction.aligned}</li>
          <li>Neutral: {report.culturalContext.audienceReaction.neutral}</li>
          <li>Opposed: {report.culturalContext.audienceReaction.opposed}</li>
        </ul>
      </Section>
      <Section
        title="Full Report"
        open={open.full}
        onClick={() => setOpen((o) => ({ ...o, full: !o.full }))}
      >
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
          {JSON.stringify(report.fullReport, null, 2)}
        </pre>
      </Section>
    </div>
  );
};

export default BiasReportViewer;
