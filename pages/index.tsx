import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import React, { useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import Button from "../components/Button";
import Layout from "../components/Layout";
import Markdown from "../components/Markdown";
import { MyChatGPTContext } from "../contexts/MyChatGPTContext";

export default function Home() {
  const router = useRouter();
  const { dispatch } = useContext(MyChatGPTContext);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-150px)] flex-col items-center justify-center">
        <div className="overflow-auto">
          <Markdown
            disableCopy
            children={`### M-LAI
`}
          />
          <div className="flex items-center justify-center">
            <Button
              onClick={() => {
                const newId = uuidv4();
                dispatch({ type: "create", chatId: newId });
                router.push(`/chats/${newId}`);
              }}
              className="mt-5 flex w-[50%] items-center justify-center gap-2 bg-indigo-400 text-indigo-100 hover:bg-indigo-300 hover:text-indigo-600 dark:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-400 dark:hover:text-slate-100"
              title="Start a New Conversation"
            >
              <ChatBubbleLeftRightIcon className="h-6" aria-hidden="true" />
              Start Chat Now
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
