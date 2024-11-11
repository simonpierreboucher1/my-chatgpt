import {
  ChatBubbleLeftRightIcon,
  ChevronDoubleDownIcon,
  ChevronDoubleUpIcon,
  ClipboardDocumentIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { PaperAirplaneIcon as PaperAirplaneIconSolid } from "@heroicons/react/24/solid";
import { useInViewport } from "ahooks";
import { useRouter } from "next/router";
import React, { useContext, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Button from "../../components/Button";
import Layout from "../../components/Layout";
import Markdown from "../../components/Markdown";
import { MyChatGPTContext } from "../../contexts/MyChatGPTContext";
import { wrappedWriteClipboard } from "../../utils/client";

export default function ChatPage() {
  const router = useRouter();
  const { uid } = router.query;
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [activeResponse, setActiveResponse] = useState("");
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const { state, dispatch } = useContext(MyChatGPTContext);
  const chatListTop = useRef(null);
  const chatListBottom = useRef(null);
  const [_chatListTopInViewport, chatListTopRatio] = useInViewport(chatListTop);
  const [_chatListBottomInViewport, chatListBottomRatio] =
    useInViewport(chatListBottom);

  function scrollDown() {
    chatListBottom.current.scrollIntoView({
      behavior: "smooth",
      alignToTop: false,
    });
  }

  function scrollUp() {
    chatListTop.current.scrollIntoView({
      behavior: "smooth",
      alignToTop: true,
    });
  }

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem(uid as string) || "[]"));
  }, [uid]);

  useEffect(() => {
    scrollDown();
  }, [history]);

  async function handleSubmit() {
    if (input.trim().length === 0) {
      alert("Input is empty");
      return;
    }

    setSubmitDisabled(true);

    const newHistory = [...history];
    let botReply = "";
    let counter = 0;
    try {
      const encodeResponse = await fetch("/api/encode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          history,
          "max-tokens": 4096,
        }),
      });
      const { messages } = await encodeResponse.json();

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          temperature: state.temperature,
        }),
      });

      if (response.status !== 200) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = response.body;
      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;

      newHistory.push({ role: "user", content: input });
      setHistory(newHistory);
      setInput("");

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setActiveResponse((prev) => prev + chunkValue);
        botReply += chunkValue;
        counter++;
        if (counter % 10 === 0) {
          scrollDown();
        }
      }
    } catch (error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    } finally {
      if (botReply !== "") {
        newHistory.push({ role: "assistant", content: botReply });
        localStorage.setItem(uid as string, JSON.stringify(newHistory));
        setHistory([...newHistory]);
      }

      setActiveResponse("");
    }

    setSubmitDisabled(false);
  }

  async function handleKeyDown(e: KeyboardEvent) {
    // Submit when only Enter is pressed
    if (
      (e.key == "Enter" || e.keyCode == 13) &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {
      e.preventDefault();
      await handleSubmit();
    }
  }

  async function handleExport() {
    const historyText = history
      .map(
        (x, index) =>
          (x.role === "assistant" ? "A" : "Q") +
          (Math.floor(index / 2) + 1) +
          ": " +
          x.content
      )
      .join("\n");
    await wrappedWriteClipboard(historyText);
    alert("Export successful");
  }

  async function onSubmit(event) {
    event.preventDefault();
    await handleSubmit();
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-150px)] flex-col justify-between gap-5">
        <div className="grow overflow-auto">
          <div className="flex flex-col justify-center gap-2">
            <div key="chat-list-top" ref={chatListTop}></div>
            {history.map((item, index) =>
              item.role === "assistant" ? (
                <Markdown
                  className="rounded-md bg-indigo-200 p-2 leading-relaxed dark:bg-slate-600"
                  key={uid + "-" + index.toString()}
                  children={item.content}
                />
              ) : (
                <Markdown
                  className="p-2"
                  key={uid + "-" + index.toString()}
                  children={item.content}
                />
              )
            )}
            {activeResponse !== "" ? (
              <Markdown
                className="rounded-md bg-indigo-200 p-2 leading-relaxed dark:bg-slate-600"
                key={uid + "-" + history.length.toString()}
                children={activeResponse}
              />
            ) : null}
            <div key="chat-list-bottom" ref={chatListBottom}></div>
          </div>
        </div>
        <div className="md-0 pd-0 flex flex-col items-center justify-center gap-2 md:flex-row">
          <textarea
            rows={3}
            name="input"
            placeholder="Enter here (press Enter to submit, Shift+Enter to add a new line)"
            value={input}
            className="h-full w-full rounded-md border-2 border-double border-slate-400 bg-indigo-200 dark:bg-slate-600 md:basis-[7/8]"
            onChange={(e) => setInput(e.target.value)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onKeyDown={(e) => handleKeyDown(e as any as KeyboardEvent)}
          />
          <div className="margin-2 flex basis-1/5 items-center justify-center gap-2 ">
            <Button
              onClick={onSubmit}
              className="flex items-center justify-center text-indigo-300 disabled:cursor-not-allowed hover:text-indigo-600 disabled:hover:text-indigo-300 dark:text-slate-400 dark:hover:text-slate-100 dark:disabled:hover:text-slate-400"
              title="Send current input to ChatGPT"
              disabled={submitDisabled}
            >
              {submitDisabled ? (
                <PaperAirplaneIconSolid className="h-6" aria-hidden="true" />
              ) : (
                <PaperAirplaneIcon className="h-6" aria-hidden="true" />
              )}
            </Button>
            {chatListTopRatio < 1 ? (
              <Button
                className="absolute bottom-[70vh] right-5"
                onClick={scrollUp}
                title="Scroll to top"
              >
                <ChevronDoubleUpIcon
                  className="h-6 text-indigo-300 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-slate-100"
                  aria-hidden="true"
                />
              </Button>
            ) : null}
            {chatListBottomRatio < 1 ? (
              <Button
                className="absolute bottom-[30vh] right-5"
                onClick={scrollDown}
                title="Scroll to bottom"
              >
                <ChevronDoubleDownIcon
                  className="h-6 text-indigo-300 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-slate-100"
                  aria-hidden="true"
                />
              </Button>
            ) : null}
            <Button
              onClick={handleExport}
              title="Copy the entire conversation to clipboard"
            >
              <ClipboardDocumentIcon
                className="h-6 text-indigo-300 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-slate-100"
                aria-hidden="true"
              />
            </Button>
            <Button
              onClick={() => {
                const newId = uuidv4();
                dispatch({ type: "create", chatId: newId });
                router.push(`/chats/${newId}`);
              }}
              className="lg:hidden"
              title="Start a new conversation (the current conversation will be automatically saved)"
            >
              <ChatBubbleLeftRightIcon
                className="h-6 text-indigo-300 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-slate-100"
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
