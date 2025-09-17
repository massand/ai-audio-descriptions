export interface Word {
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

export interface TranscriptPhrase {
  speaker: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  confidence: number;
  words: Word[];
  locale: string;
}

export interface Segment {
  startTimeMs: number;
  endTimeMs: number;
  summaryDescription: string;
  segmentId: string;
}

export interface FieldValue {
  type: string;
  valueString?: string;
  valueArray?: FieldValue[];
  valueObject?: { [key: string]: FieldValue };
}

export interface Content {
  markdown: string;
  fields: {
    Segments: Array<{
      SegmentId: string;
      StartTimeMs: number;
      EndTimeMs: number;
      SummaryDescription: string;
    }> | {
      type: string;
      valueArray: Array<{
        type: string;
        valueObject: {
          SegmentId: {
            type: string;
            valueString: string;
          };
          StartTimeMs?: {
            type: string;
            valueString: string;
          };
          EndTimeMs?: {
            type: string;
            valueString: string;
          };
          SummaryDescription: {
            type: string;
            valueString: string;
          };
        };
      }>;
    };
  };
  kind: string;
  startTimeMs: number;
  endTimeMs: number;
  width: number;
  height: number;
  KeyFrameTimesMs: number[];
  transcriptPhrases: TranscriptPhrase[];
  cameraShotTimesMs: number[];
  segments: Segment[];
}

export interface Result {
  analyzerId: string;
  apiVersion: string;
  createdAt: string;
  warnings: any[];
  contents: Content[];
}

export interface ContentUnderstandingResults {
  id: string;
  status: string;
  result: Result;
}
