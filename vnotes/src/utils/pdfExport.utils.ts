import { jsPDF } from "jspdf";
import { NotesItem } from "../classes/Notes";
import { NotesHeading } from "../classes/Pdf";
import { formatTimestamp } from "./timestamp.utils";
async function buildPdf(notesHeading: NotesHeading, notesContent: NotesItem[]) {
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
    let currentPageHeight = 0;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 2) build the top parts
    currentPageHeight = buildTopPart(doc, notesHeading, pageWidth);

    // 3) build the body (note details)
    currentPageHeight = await buildBody(
        doc,
        notesContent,
        currentPageHeight,
        pageHeight,
        pageWidth
    );
    doc.save(`${notesHeading.notesTitle}.pdf`);
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
    currentHeight += 7;

    // Video URL
    doc.setFontSize(12);
    doc.text(
        videoUrl ? `Video Link: ${videoUrl}` : "Video URL Here",
        margin,
        currentHeight
    );
    currentHeight += 5;

    // Draw a line to separate top part from body
    doc.setLineWidth(0.5);
    doc.line(margin, currentHeight, pageWidth - margin, currentHeight);
    currentHeight += 10;

    return currentHeight;
}

// ============ FOR THE MAIN NOTES
async function buildBody(
    doc,
    notesContent: NotesItem[],
    currentPageHeight,
    pageHeight,
    pageWidth
) {
    for (const note of notesContent) {
        if (note.isSnapshot) {
            currentPageHeight = await addSnapshot(
                doc,
                note,
                currentPageHeight,
                pageHeight
            );
        } else {
            currentPageHeight = generateText(
                doc,
                note,
                currentPageHeight,
                pageHeight,
                pageWidth
            );
        }
    }
    return currentPageHeight;
}

// ============ FOR THE CONTENTS

// add snapshot
async function addSnapshot(
    doc,
    notesContent: NotesItem,
    currentPageHeight,
    pageHeight
) {
    const lineHeight = doc.getFontSize() / doc.internal.scaleFactor;
    let imgData = notesContent.content;
    const img = new Image();
    img.src = imgData;
    await new Promise((resolve) => {
        img.onload = () => resolve(null);
    });
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const imgWidth = 150;
    const imgHeight = imgWidth / aspectRatio;

    // page break if needed
    if (currentPageHeight + imgHeight > pageHeight - 20) {
        doc.addPage();
        currentPageHeight = 20;
    }
    doc.addImage(imgData, "PNG", 10, currentPageHeight, imgWidth, imgHeight);
    currentPageHeight += imgHeight;
    doc.text(
        `Snapshot at: ${formatTimestamp(notesContent.timestamp)}`,
        10,
        currentPageHeight + lineHeight
    );
    currentPageHeight += lineHeight + 2;

    return currentPageHeight;
}

function generateText(
    doc,
    noteItem: NotesItem,
    currentPageHeight,
    pageHeight,
    pageWidth
) {
    const marginX = 10;
    const marginY = 20;
    doc.setFontSize = 14;
    const bottomMargin = 10;
    const lineHeight = doc.getFontSize() / doc.internal.scaleFactor;
    currentPageHeight += lineHeight;
    const timestampPrefix =
        noteItem.timestamp > -1
            ? `   [${formatTimestamp(noteItem.timestamp)}]`
            : "   ";
    const contents = timestampPrefix + noteItem.content;
    const lines = doc.splitTextToSize(contents, pageWidth - 20);
    for (const line of lines) {
        if (currentPageHeight + lineHeight > pageHeight - bottomMargin) {
            doc.addPage();
            currentPageHeight = marginY;
        }
        doc.text(line, marginX, currentPageHeight);
        currentPageHeight += lineHeight;
    }
    currentPageHeight += 2;
    return currentPageHeight;
}

export { buildPdf };
