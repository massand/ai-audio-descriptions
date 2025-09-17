import axios from "axios";
import { Segment } from "../Models";
import { ContentUnderstandingResults } from "../ContentUnderstandingModels";
import { msToTime } from "./Helper";
import { uploadToBlob } from "./BlobHelper";

/**
 * Fetches analyzer results from blob storage and converts them to audio descriptions
 */
export const fetchAndConvertAnalyzerResults = async (analyzerResultJsonUrl: string, title: string): Promise<Segment[] | null> => {
    try {
        // Fetch the analyzer results from blob storage
        const response = await axios.get(analyzerResultJsonUrl);
        const analyzerResults: ContentUnderstandingResults = response.data;
        
        // Extract segments from the analyzer results
        const segments = extractSegmentsFromAnalyzerResults(analyzerResults);
        
        if (segments.length === 0) {
            console.warn("No segments found in analyzer results");
            return null;
        }
        
        // Save the new audio descriptions to blob storage
        await uploadToBlob(JSON.stringify(segments, null, 2), title, title + ".json", null);
        
        return segments;
    } catch (error) {
        console.error("Error fetching or converting analyzer results:", error);
        return null;
    }
};

/**
 * Extracts segments from analyzer results and converts them to the required format
 */
const extractSegmentsFromAnalyzerResults = (analyzerResults: ContentUnderstandingResults): Segment[] => {
    const segments: Segment[] = [];
    
    if (!analyzerResults.result?.contents) {
        console.warn("Magic: No contents found in analyzer results");
        return segments;
    }
    
    console.log("Magic: Processing analyzer results with", analyzerResults.result.contents.length, "content items");
    
    analyzerResults.result.contents.forEach((content, contentIndex) => {
        console.log(`Magic: Processing content ${contentIndex}:`, content);
        let contentSegments: any[] = [];
        
        // First priority: Check for direct segments array (result.contents[x].segments[x].description)
        if (content.segments && Array.isArray(content.segments)) {
            console.log(`Magic: Found direct segments array in content ${contentIndex} with ${content.segments.length} segments`);
            contentSegments = content.segments.map((segment: any) => ({
                SegmentId: segment.segmentId || segment.SegmentId,
                StartTimeMs: segment.startTimeMs || segment.StartTimeMs,
                EndTimeMs: segment.endTimeMs || segment.EndTimeMs,
                description: segment.description || segment.summaryDescription || segment.SummaryDescription
            }));
        }
        // Second priority: Check for fields.Segments structure
        else if (content.fields?.Segments) {
            // Check if it's the new simplified structure (array)
            if (Array.isArray(content.fields.Segments)) {
                console.log(`Magic: Using contents[${contentIndex}].fields.Segments array data`);
                contentSegments = content.fields.Segments.map((segment: any) => ({
                    SegmentId: segment.SegmentId || segment.segmentId,
                    StartTimeMs: segment.StartTimeMs || segment.startTimeMs,
                    EndTimeMs: segment.EndTimeMs || segment.endTimeMs,
                    description: segment.description || segment.SummaryDescription || segment.summaryDescription
                }));
            }
            // Check if it's the old nested structure with valueArray
            else if ('valueArray' in content.fields.Segments && content.fields.Segments.valueArray) {
                console.log(`Magic: Using contents[${contentIndex}].fields.Segments.valueArray data (nested structure)`);
                contentSegments = content.fields.Segments.valueArray.map((item: any) => ({
                    SegmentId: item.valueObject.SegmentId.valueString,
                    StartTimeMs: item.valueObject.StartTimeMs?.valueInteger || parseInt(item.valueObject.StartTimeMs?.valueString || "0"),
                    EndTimeMs: item.valueObject.EndTimeMs?.valueInteger || parseInt(item.valueObject.EndTimeMs?.valueString || "0"),
                    description: item.valueObject.description?.valueString || item.valueObject.SummaryDescription?.valueString
                }));
            }
        }
        
        console.log(`Magic: Extracted ${contentSegments.length} segments from content ${contentIndex}`);
        
        // Convert to the required Segment format
        contentSegments.forEach((segment, segmentIndex) => {
            console.log(`Magic: Processing segment ${segmentIndex} from content ${contentIndex}:`, segment);
            
            // Get the description from the segment
            let description = segment.description || segment.SummaryDescription || segment.summaryDescription || "";
            
            // If still empty, try to find any field that might contain the description
            if (!description && typeof segment === 'object') {
                for (const key of Object.keys(segment)) {
                    if (key.toLowerCase().includes('description') || key.toLowerCase().includes('summary')) {
                        description = segment[key];
                        console.log(`Magic: Found description in key "${key}":`, description);
                        break;
                    }
                }
            }
            
            console.log(`Magic: Final description for content[${contentIndex}].segments[${segmentIndex}]:`, description);
            
            // Create segment with proper timing
            const startTimeMs = segment.StartTimeMs || segment.startTimeMs || 0;
            const endTimeMs = segment.EndTimeMs || segment.endTimeMs || 0;
            
            segments.push({
                startTime: msToTime(startTimeMs),
                endTime: msToTime(endTimeMs),
                description: description || `Segment ${segments.length + 1} (content ${contentIndex}, segment ${segmentIndex})`
            });
        });
    });
    
    console.log(`Magic: Total segments extracted: ${segments.length}`);
    
    // Sort segments by start time
    segments.sort((a, b) => {
        const timeToMs = (timeStr: string) => {
            const parts = timeStr.split(':');
            return parseInt(parts[0]) * 3600000 + parseInt(parts[1]) * 60000 + parseInt(parts[2]) * 1000;
        };
        return timeToMs(a.startTime) - timeToMs(b.startTime);
    });
    
    return segments;
};
