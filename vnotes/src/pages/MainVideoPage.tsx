import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AddNewVideo from "../components/AddNewVideo";

function MainVideoPage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    function formatDuration(seconds) {
        const h = Math.floor(seconds / 3600)
            .toString()
            .padStart(2, "0");
        const m = Math.floor((seconds % 3600) / 60)
            .toString()
            .padStart(2, "0");
        const s = Math.floor(seconds % 60)
            .toString()
            .padStart(2, "0");

        return `${h}:${m}:${s}`;
    }

    useEffect(() => {
        setLoading(true);

        (async () => {
            try {
                const vids = await window.api.listMetadata();
                console.log("res", vids);
                setVideos(vids);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div>
            <h1 className="text-3xl m-5 text-center">Video Library</h1>
            <AddNewVideo />
            <div>
                {videos.map((video: Video) => {
                    const { name, id, thumbnail, duration } = video;
                    return (
                        <Link to={`/videos/${id}`} key={id}>
                            <div className="card bg-base-300 w-full max-w-1/4 shadow-s m-5">
                                <figure>
                                    <img src={thumbnail} alt="thumbnail" />
                                </figure>
                                <div className="card-body">
                                    <h2 className="card-title line-clamp-3">{name}</h2>
                                    <p>{formatDuration(duration)}</p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export default MainVideoPage;
