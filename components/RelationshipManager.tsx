import React, { useEffect, useState } from "react";
import { Ban, Check, UserMinus, VolumeX, X } from "lucide-react";
import { socialAPI } from "../services/api";

const RelationshipManager: React.FC = () => {
  const [data, setData] = useState<any>({
    follow: [],
    friend: [],
    friends: [],
    blocks: [],
    mutes: [],
  });
  const [status, setStatus] = useState("");
  const load = async () => {
    try {
      const [follow, friend, friends, blocks, mutes] = await Promise.all([
        socialAPI.getFollowRequests(),
        socialAPI.getFriendRequests(),
        socialAPI.getFriends(),
        socialAPI.getBlocks(),
        socialAPI.getMutes(),
      ]);
      setData({
        follow: follow.data?.data || [],
        friend: friend.data?.data || [],
        friends: friends.data?.data || [],
        blocks: blocks.data?.data || [],
        mutes: mutes.data?.data || [],
      });
    } catch {
      setStatus("Could not load relationship controls.");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const respond = async (
    kind: "follow" | "friend",
    id: string,
    response: "accepted" | "declined",
  ) => {
    kind === "follow"
      ? await socialAPI.respondFollowRequest(id, response)
      : await socialAPI.respondFriendRequest(id, response);
    setStatus(
      `${kind === "follow" ? "Follow" : "Friend"} request ${response}.`,
    );
    await load();
  };
  const list = (
    title: string,
    items: any[],
    action: (item: any) => React.ReactNode,
    icon?: React.ReactNode,
  ) => (
    <section className="border border-gray-800 rounded-lg p-3">
      <h3 className="text-xs font-bold text-white flex items-center gap-2">
        {icon}
        {title}
        <span className="ml-auto text-gray-500">{items.length}</span>
      </h3>
      <div className="space-y-2 mt-3">
        {items.map((item) => {
          const person = item.requester || item;
          return (
            <div
              key={item._id || person._id}
              className="flex items-center gap-2 bg-black/60 p-2 rounded"
            >
              <img
                src={person.avatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-xs text-gray-200 flex-1 truncate">
                {person.displayName || person.username}
              </span>
              {action(item)}
            </div>
          );
        })}
        {!items.length && (
          <p className="text-[11px] text-gray-600">Nothing here.</p>
        )}
      </div>
    </section>
  );
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Follow, Friend, Block, and Mute are separate controls. Paid Subscribe
        remains unavailable.
      </p>
      {list("Follow requests", data.follow, (item) => (
        <>
          <button
            aria-label="Accept follow request"
            onClick={() => respond("follow", item._id, "accepted")}
            className="text-green-400"
          >
            <Check size={15} />
          </button>
          <button
            aria-label="Decline follow request"
            onClick={() => respond("follow", item._id, "declined")}
            className="text-red-400"
          >
            <X size={15} />
          </button>
        </>
      ))}
      {list("Friend requests", data.friend, (item) => (
        <>
          <button
            aria-label="Accept friend request"
            onClick={() => respond("friend", item._id, "accepted")}
            className="text-green-400"
          >
            <Check size={15} />
          </button>
          <button
            aria-label="Decline friend request"
            onClick={() => respond("friend", item._id, "declined")}
            className="text-red-400"
          >
            <X size={15} />
          </button>
        </>
      ))}
      {list("Friends", data.friends, (friend) => (
        <button
          aria-label={`Unfriend ${friend.username}`}
          onClick={async () => {
            await socialAPI.removeFriend(friend._id);
            setStatus("Friend removed.");
            await load();
          }}
          className="text-red-400"
        >
          <UserMinus size={15} />
        </button>
      ))}
      {list(
        "Blocked users",
        data.blocks,
        (user) => (
          <button
            aria-label={`Unblock ${user.username}`}
            onClick={async () => {
              await socialAPI.unblock(user._id);
              setStatus("User unblocked.");
              await load();
            }}
            className="text-red-400"
          >
            <Ban size={15} />
          </button>
        ),
        <Ban size={13} />,
      )}
      {list(
        "Muted users",
        data.mutes,
        (user) => (
          <button
            aria-label={`Unmute ${user.username}`}
            onClick={async () => {
              await socialAPI.unmute(user._id);
              setStatus("User unmuted.");
              await load();
            }}
            className="text-gray-300"
          >
            <VolumeX size={15} />
          </button>
        ),
        <VolumeX size={13} />,
      )}
      {status && (
        <p role="status" className="text-xs text-gray-300">
          {status}
        </p>
      )}
    </div>
  );
};
export default RelationshipManager;
