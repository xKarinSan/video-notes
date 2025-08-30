import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AddNewVideo from "../components/AddNewVideo";
import { Video } from "../classes/Video";

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
    function handleVideoAdded(newVideo: Video) {
        setVideos((videos) => [...videos, newVideo]);
    }

    useEffect(() => {
        setLoading(true);

        (async () => {
            try {
                const vids = await window.api.listMetadata();
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
            <h1 className="text-3xl m-5 text-center ">Video Library</h1>
            <AddNewVideo onVideoAdded={handleVideoAdded} />
            <div className="m-auto p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((video: Video) => {
                    const { name, id, thumbnail, duration } = video;
                    return (
                        <div className="card bg-base-300 w-full">
                            <Link to={`/videos/${id}`} key={id}>
                                <figure>
                                    <img src={thumbnail} alt="thumbnail" />
                                </figure>
                                <div className="card-body">
                                    <h2 className="card-title line-clamp-3">
                                        {name}
                                    </h2>
                                    <p>{formatDuration(duration)}</p>
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MainVideoPage;
