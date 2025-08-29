import { jsPDF } from "jspdf";
import { v4 as uuidv4 } from "uuid";
import { NotesItem, NotesMetadata } from "../classes/Notes";
import { NotesHeading } from "../classes/Pdf";

function buildPdf(notesHeading: NotesHeading, notesContent: NotesItem[]) {
    /*
    Top part:
    - Title of the notes
    - Date exported
    - Video Title
    - Video URL

    Contents:
    - AI summaries first
    - Everything else top to bottom (timestamped)
    - render the stuff
    */

    // 1) init document
    const doc = new jsPDF("p", "mm", [297, 210]);
    let pageHeight = 0;
    const pageWidth = doc.internal.pageSize.getWidth();

    // 2) build the top parts
    pageHeight += buildTopPart(doc, notesHeading, pageWidth);

    // 3) build the body (note details)
    buildBody(doc);
    const docId = uuidv4();
    doc.save(`${docId}.pdf`);
}

// ============ FOR TOP CONTENT
function buildTopPart(doc, notesHeading: NotesHeading, pageWidth) {
    const { notesTitle, videoTitle, videoUrl } = notesHeading;
    const margin = 10;
    let currentHeight = margin;

    // Title of the notes
    doc.setFontSize(18);
    doc.text(notesTitle ?? "Notes Title here", pageWidth / 2, currentHeight, {
        align: "center",
    });
    currentHeight += 10;

    // Date exported
    doc.setFontSize(12);
    const exportDate = new Date().toLocaleString();
    doc.text(`Exported on: ${exportDate}`, pageWidth / 2, currentHeight, {
        align: "center",
    });
    currentHeight += 10;

    // Video Title
    doc.setFontSize(14);
    doc.text(videoTitle ?? "Video Title Here", margin, currentHeight);
    currentHeight += 10;

    // Video URL
    doc.setFontSize(12);
    doc.text(videoUrl ?? "Video URL Here", margin, currentHeight);
    currentHeight += 20;

    // Draw a line to separate top part from body
    doc.setLineWidth(0.5);
    doc.line(margin, currentHeight, pageWidth - margin, currentHeight);
    currentHeight += 10;

    return currentHeight; // Return the height where the body should start
}

// ============ FOR THE MAIN NOTES
function buildBody(doc) {}

// ============ FOR TH CONTENTS

// add snapshot
function addSnapshot() {}

function addSummary() {}

function addNotes() {}

export { buildPdf };
