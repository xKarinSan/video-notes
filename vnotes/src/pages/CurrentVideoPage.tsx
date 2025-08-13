import { useParams } from "react-router-dom";

function CurrentVideoPage() {
    const { videoId } = useParams();
    return (
        <div>
            <p>Current video ID: {videoId}</p>
        </div>
    );
}

export default CurrentVideoPage;
