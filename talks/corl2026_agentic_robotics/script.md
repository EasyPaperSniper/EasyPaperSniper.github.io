# CoRL 2026 Workshop on Agentic Robotics — talk script

Speaker: Tianyu Li (Dexmate). Slot: Nov 12, 2026, 15:45–16:05 (20 min, listed as a 20-minute invited talk; Q&A not stated). Last talk before the coffee break.

Target: about 17:00 at a calm pace (~130 words/min), video time included; timing is a guide, not a hard limit. Cut plan and rehearsal plan at the end.

Markers: **[CUT-A]** = first to cut. **[CUT-B]** = cut next if Q&A must fit inside 20 min. `[click]` = advance a build step inside the slide.

---

## 1 · Title — 0:20 (clock 0:20)

Hi everyone, I'm Tianyu, founding scientist at Dexmate. Today I'll share what we found when we let coding agents control a real robot, and how that led to the design of our AI-native robot system.

## 2 · Coding agents can tackle robotics tasks — 0:45 (clock 1:05)

*(Video: the door segment from the blog teaser, with Claude Code's agent log on the right; captions removed. Loops.)*

Coding agents can already tackle robotics tasks. Here we simply ask Claude Code to open the door and enter the room, and without any door detector or planner, it uses the cameras and our robot control service to find the handle, open the door, and drive in. It works, although this video is sped up, and the real run took several minutes.

## 3 · But they can also be unreliable — 0:20 (clock 1:25)

*(Video: the three-panel segment from the blog teaser: long pauses, unsafe contact, precision failures; captions removed. Loops.)*

But these agents can also be quite unreliable. They sometimes think for over a minute before moving, collide with the environment, or miss a precise placement, so we wanted to look closely at what is going on inside these runs.

## 4 · So we investigate how coding agents address robotics tasks — 0:50 (clock 2:15)

*(Videos: the three task clips from the blog, played at speeds that give each about 40 s, looping.)*

We tested Claude Code with Opus and Codex with GPT-6 Astra on three tasks: putting fruit into a basket, placing a bowl on a rack, and going through a door. The agent controls the robot only through a few basic MCP tools, and every motion goes through our control service.

`[click]` In the learning stage, the agent solves the task for the first time and saves the skills that worked. In the operating stage, a fresh session uses those saved skills to do the task again.

## 5 · Successful execution still takes minutes — 0:40 (clock 2:55)

*(Chart: mean time and cost per run, learning vs execution, both models.)*

Both agents succeeded in every fruit and door trial, but neither solved the bowl-rack task, which needs more precise contact. Learning a task once takes several minutes, which is fine, because you only pay that cost once.

`[click]` The problem is that execution, which you pay for every time, is also slow, so clearing a table full of objects would take close to an hour with Opus, and several hours with Astra.

## 6 · Observe-think-act — 0:35 (clock 3:30)

*(Video: the teaser's observe–think–act section, fruit task, third-person and head camera with the loop tracker. Loops.)*

Inside a run, the agent works in a loop: it observes the camera image, thinks about what to do next, and acts. When a move doesn't reach its target, it looks again and retries, so the question is where the time goes.

## 7 · Thinking Time > Action Time — 0:35 (clock 4:05)

*(Chart animates in: the split of task time per model, then what fills the think time. Successful fruit and door runs, original tools, 12 runs per model.)*

The answer is that the robot is moving only a small part of the time, and most of the rest is the model thinking between steps.

`[click]` Most of that thinking ends with deciding the next action, and the rest goes to re-checking results, writing geometry code, or deciding to wait. So the pace is set by the model's thinking, not by the robot's motion.

*(Notes, not for the slide: this tags each pause by the next step, so it includes harness latency and output writing. Astra logs tool start and end together, so its code run time sits inside these pauses; its think share is an upper bound. Small sample: 6 runs per task and model.)*

## 8 · 126 seconds for a 6.5 cm correction — 0:45 (clock 4:50)

*(Video: the 126-second check at 8×, with the agent's log appearing line by line and a progress bar filling from 0:00 to 2:16.)*

Here is one of those pauses. With the hand already above the basket, the agent checks sizes, fits the basket rim, and crops the image again, and after more than two minutes it asks for a correction of just a few centimeters.

`[click]` *(Video: fixed sleep from motion start, real time, with the log and a motion · sleep · response bar.)* Waiting also wastes time, because the agent often keeps sleeping after the motion has already finished.

## 9 · Saved skills still need model judgment — 0:45 (clock 5:35)

*(Video: saved skill files and helpers.)*

The agents build and save their own tools, like geometry helpers, planners, and skill files. But the model still makes the key decisions: where to aim, how to make contact, and how to react to feedback, for example retrying when a lift fails, or finding the basket again from a newer image.

`[click]` Reusing saved skills helps, especially for Opus, but each run still needs a lot of fresh thinking.

## 10 · Seeing danger is not stopping — 1:05 (clock 6:40)

*(Videos: the door contact, head and wrist; on click, the other three failures as looping clips.)*

This judgment matters most for safety. Here the agent writes that there is high force on the arm and it should retract, but then keeps pushing forward, calls the arm a "bumper", and only retracts almost a minute later.

`[click]` We also saw unnoticed table contact, pushing a latched door as if it were progress, and a collision where the operator had to stop the robot. In all of these cases, the motion still reported normal completion, so task success doesn't mean the run was safe.

We even saw the agent send an angle in degrees where the tool expected radians, and on a robot, that small unit mistake becomes a rotation many times larger than intended.

*(Notes: the unit error was observed by the speaker during the experiments; it is not in the analysed logs. 57× is just the unit ratio, 1 rad ≈ 57.3°.)*

## 11 · What we learned so far — 0:20 (clock 7:00)

To sum up, the agent runs an observe, think, and act loop, spends most of its time thinking, keeps the key judgments for itself, and can make unsafe moves even when it sees the risk.

## 12 · What if we empower the coding agent? — 0:15 (clock 7:15)

*(Section slide: what if we empower the coding agent? 1. Give it more tools. 2. Ask it to build a simulation.)*

So we asked whether more help would fix this, and we tried two things: giving the agent more robotics tools, and letting it rehearse in simulation.

## 13 · What we added — 0:20 (clock 7:35)

*(Diagram: the original MCP tools and control service, then the four added capabilities.)*

Originally, the agent only had basic tools to look, move, and grip.

`[click]` We added segmentation, a reachable-pose search, waypoint collision checks, and a whole-body motion planner.

## 14 · More tools did not consistently help — 0:30 (clock 8:05)

*(Table: success, mean time and mean cost, original vs expanded tools, per model; then tool usage.)*

The extra tools didn't help as much as we expected. Astra's success rate dropped, and successful runs became slower and more expensive for both models.

`[click]` And this is not because the agents ignored the tools, since almost every run used them.

## 15 · Added tools shifted effort into checking — 0:30 (clock 8:35)

*(Chart: share of task time, original vs expanded tools: act, deciding the next action, and checking · querying · computing.)*

The time just moved. With more tools, the agent spent much more time checking and querying, so adding tools doesn't remove the work, it moves it somewhere else. A tool only helps if its result feeds directly into the next decision, and I think that is an engineering problem: how we package tools into skills the agent can rely on.

*(Notes: successful fruit/door runs; original n = 24, expanded n = 22. "Checking · querying · computing" = all think time that did not end in an action decision, plus the run time of observe/check/query calls. Part of the time before a waypoint check is really motion design; counted that way, the shift is smaller but still there.)*

## 16 · Build a simulation first — 0:20 (clock 8:55)

*(Section slide with the added instruction.)*

The second thing we tried was simulation. For the bowl task, we told the agent it could build a physics simulation of the scene and rehearse its solution there first.

## 17 · How the agent builds the scene — 0:20 (clock 9:15) [CUT-A]

*(Video: the agent's Isaac Sim scene, full rim-pinch rehearsal.)*

The agents built the scene themselves from depth and images, but everything about contact, like mass and friction, they had to guess.

## 18 · Rehearsal changes the grasp strategy — 1:10 (clock 10:25)

*(Videos: three rehearsals side by side: no lift, slip, success, one in focus at a time; on the last click, the simulated rim pinch next to the real-robot run.)*

In this run, the agent first grasps the bowl across its diameter, and the bowl never lifts.

`[click]` Then it adjusts the grasp, but the bowl still slips out.

`[click]` After a long time of trying, it switches to a rim pinch, and the bowl finally lifts, so it moves on to the real robot.

`[click]` On the real robot, the same rim pinch works, and the robot lifts the bowl and places it on the rack. But getting there took most of an hour in simulation for a couple of minutes on the real robot, and only one of four standard runs succeeded.
## 19 · What our experiments show — 0:15 (clock 10:40)

So coding agents can really do some robotics tasks, but three issues remain: time, safety, and motor skills. Let me compare each one quickly with coding.

## 20 · Model latency cannot set the control rate — 0:50 (clock 11:30)

*(Chart: one frequency axis in hertz. Large models from OpenRouter on the left, robot policies on the right.)*

First, time. Here, one call to a large model takes a few seconds. But in our runs, a full agent loop, where the agent reads the image, thinks, and sends the next command, took even longer, so the robot only got a new command every several seconds.

`[click]` On the right are the policies people actually run on robots, which update many times per second, so the models that can reason about a scene are orders of magnitude too slow.

`[click]` A coding task can wait while the model thinks, but for a robot, the world keeps moving.

*(Notes: model latencies are OpenRouter's average end-to-end latency for the best provider over the past week (the per-provider figures OpenRouter labels 'Avg'), read Nov 11, 2026 (openrouter.ai/<model>/performance; data in deck/data/openrouter_latency_2026-11-11.json). On the chart but not read aloud: GPT-6 Astra 7.4 s, Gemini 4 Carbon 24.3 s, DeepSeek V4.1 Flash 0.96 s, GPT-6 Luna Decisions 0.26 s, Jev 1.14 0.11 s. They reflect OpenRouter's general traffic, not our robot prompts; reasoning models' end-to-end time depends on output length. VLM = vision-language model; decider = structured decision model. Full agent loop = mean time from an observation to the next tool call in the Anatomy runs (input handling, reasoning, response, latency): Opus 5.6 s, Astra 12.1 s. π0.5: "at 50 Hz (with action chunking)" (arXiv 2504.16054); SONIC: "The policy loop runs at 50 Hz" (arXiv 2511.07820); Fast-WAM: 190 ms inference latency (arXiv 2603.16666), ~5 Hz is our conversion.)*

## 21 · Safety needs a local response — 0:20 (clock 11:50)

Second, safety. When a coding agent makes a mistake, you can simply revert it.

`[click]` A robot has no undo, so stopping must happen within milliseconds, without waiting for the model.

## 22 · Plans depend on reliable motor skills — 0:20 (clock 12:10)

Third, motor skills. A coding agent has precise building blocks, like writing files and running tests.

`[click]` A robot's skills are continuous and contact-rich, and very few of them are mature yet.

## 23 · Also different: input and checking — 0:20 (clock 12:30)

A coding agent also reads exact text, while a robot reads noisy sensors.

`[click]` And a coding agent has tests to know when it's done, while a robot has no such signal.

## 24 · We need an AI-native robot system — 0:25 (clock 12:55)

So a large model alone is not enough, and we need an AI-native robot system around it. Its goal is to let the large model drive the robot to finish tasks reliably and efficiently.

## 25 · An AI-native robot system — 1:10 (clock 14:05)

*(Diagram builds top-down: the robot brain in the cloud with its contents and rate; then each device level with its purpose, contents and rate: task execution & grounding, primitive skills, robot service (with the brain's direct-access links); then memory is highlighted.)*

This is the system we are building at Dexmate. In the cloud, the robot brain is an agent system with a large model at its core and a harness for memory, context, and task tracking, and it turns the user's task into a plan at less than 0.5 hertz.

`[click]` On the device, task execution and grounding turns each subtask into motor-skill commands at 1 to 10 hertz, using VLAs and planners, while a subtask monitor tracks progress.

`[click]` Below it, primitive skills solve local tasks such as motion tracking at 20 to 100 hertz.

`[click]` And the robot service keeps the hardware safe, with collision avoidance at 200 to 1000 hertz.

`[click]` We have started studying parts of this system, beginning with memory.

## 26 · What should a robot remember? — 0:50 (clock 14:55)

*(Video: real robot, memory demo, with two captions: what the robot saw earlier, and what it is asked later. Reference on the slide.)*

In MeMoREval, the robot sees things happen before it knows the question, like moving a lemon and later being asked for the apple that was next to it. We found that keeping camera frames works clearly better than text descriptions, and adding a scene graph helps a bit more. The reason is that a description has to decide what matters before the question is known, and it often drops exactly the detail you need later.

*(Notes: MeMoREval, arXiv 2610.12561; Gemini 3.7 Flash, 53 simulated tasks, 5 memory backends × 3 seeds; descriptions 56 / 59 / 60% at 64 / 256 / 1024 tokens; write cost $9.30 vs $11.08–12.09 per 1,000 steps. Mostly simulation; real robot: two demonstrations.)*

## 27 · An AI-native robot system — 0:15 (clock 15:10)

*(The same diagram, settled; now task tracking and the subtask monitor are highlighted.)*

The second part we studied is task tracking, which decides when the task is done.

## 28 · How does a robot know it’s done? — 1:00 (clock 16:10)

*(Video: red mug at 2×; the track marks when the task is first done and when the robot undoes it. Reference on the slide.)*

Today's robot models don't know when to stop. Here the policy puts the mug upright, which finishes the task, but then keeps moving and knocks it over.

`[click]` So we tested how well current models can judge completion. The best one was right most of the time, but each check took several seconds and was expensive, while the fast, cheap models were close to guessing.

`[click]` With the simulator's facts instead of images, it became almost perfect, so the hard part is seeing the scene, not judging it.

*(Notes: The Unstoppable Robot; RoboLab with π0.5, 500 moments from 150 runs; balanced accuracy. GPT-6 Astra direct 86.0% at 4.01 s, $22.54 per 1,000 checks (50-case subset); Gemini 3.8 Flash 81.4% at 5.50 s, $4.50/1k; DeepSeek V4.1 Flash 51.2% at 2.13 s; GPT-6 Luna 49.8% at 0.28 s; Jev 1.14 59.2% at 0.49 s; Perplexity Decider 64.2% at 0.77 s. With simulator facts instead of images, Astra 98.0%, Gemini 94.8%: a changed-evidence diagnostic, not a deployable judge. Offline, in simulation.)*

## 29 · A renaissance of robotics problems — 0:40 (clock 16:50)

*(Discussion slide. Two sides: what large models now take on, and the robotics problems that come back.)*

To close, large models now handle much of the semantic side of robotics, like understanding requests and planning.

`[click]` That brings us back to the classic problems: how to build reliable systems around slow models, how to perceive the scene correctly, how to design clear interfaces between modules, and how to get dependable motor skills and fast, safe execution.

## 30 · Thanks — 0:10 (clock 17:00)

Thank you to all my collaborators on these studies. I'm happy to continue the discussion after the talk.

---

## Timing summary

Computed at a calm 130 words/min, plus ~4 s per slide change or click and short pauses inside videos: **17:00**. Expect a little more with natural pauses. Timing is a guide for rehearsal, not a hard target.

| Part | Slides | Time | Clock at end |
|---|---|---:|---:|
| Open: can tackle, but unreliable | 1–3 | 1:25 | 1:25 |
| Anatomy: setup + results | 4–5 | 1:30 | 2:55 |
| Agent behavior | 6–10 | 3:45 | 6:40 |
| What we learned so far | 11–11 | 0:20 | 7:00 |
| More tools | 12–15 | 1:35 | 8:35 |
| Simulation | 16–18 | 1:50 | 10:25 |
| Three issues, compared with coding → need an AI-native system | 19–24 | 2:30 | 12:55 |
| AI-native system + memory + task tracking | 25–28 | 3:15 | 16:10 |
| Discussion + thanks | 29–30 | 0:50 | 17:00 |

## Cut plan

- **Cut A — to about 16:40 (−0:20):** hide slide 17 (scene building).
- **Cut B — not needed:** the full script fits the 20-minute slot with room for pauses and a few questions.
- **Never cut:** 2, 3, 4, 7, 8 (first part), 10 (first part), 11, 14, 15, 18, 19, 20, 21, 22, 24, 25, 26, 28, 29.
- In presenter view, press `H` to hide/unhide the current slide. Hidden slides are skipped.

## Checkpoints (presenter timer)

| Reach slide | Full | Cut A | If late by > 45 s |
|---|---:|---:|---|
| 4 Setup | 1:25 | 1:25 | Skip slide 5's click (scale table) |
| 12 More tools | 7:00 | 7:00 | Skip slide 14's click (tool usage) |
| 19 What our experiments show | 10:25 | 10:05 | Skip slide 23 |
| 25 AI-native robot system | 12:55 | 12:35 | Keep 26 and 28 to the TL;DR line each |

## Rehearsal plan (talk is Thu Nov 12)

- **Mon Nov 9 evening:** read the full script aloud once with the deck. Record the time at each checkpoint. Mark any sentence that feels unnatural and rewrite it in your own words.
- **Tue Nov 10:** two full runs standing up, with the presenter timer. Run 1 full length. Run 2 with cut A. Note where you speed up; add a pause mark there.
- **Wed Nov 11:** confirm with the organizers whether Q&A is inside the 20 minutes. One full run on the laptop and display adapter you'll use. Check videos play from the local folder with Wi-Fi off. Then one run of only slides 19–28 (the densest part; practise slide 26 top-down, one level per click).
- **Thu Nov 12 morning:** one relaxed run with the cut that matches the slot. Don't change content after this run.
- **On stage:** if you're nervous, you'll speak faster. The full version at nervous speed runs about 10% shorter, which is why the calm target is 18 minutes. Watch the timer at slide 19; that's the decision point.
