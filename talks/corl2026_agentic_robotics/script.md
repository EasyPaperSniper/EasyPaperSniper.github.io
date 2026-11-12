# CoRL 2026 Workshop on Agentic Robotics — talk script

Speaker: Tianyu Li (Dexmate). Slot: Nov 12, 2026, 15:45–16:05 (20 min, listed as a 20-minute invited talk; Q&A not stated). Last talk before the coffee break.

Target: about 30:10 at normal pace (~140 words/min), video time included; timing is a guide, not a hard limit. Cut plan and rehearsal plan at the end.

Markers: **[CUT-A]** = first to cut. **[CUT-B]** = cut next if Q&A must fit inside 20 min. `[click]` = advance a build step inside the slide.

---

## 1 · Title — 0:20 (clock 0:20)

Hi everyone, I'm Tianyu from Dexmate. In this talk I want to share what we found when we let coding agents control a real robot, and what we think that means for how the rest of the robot system should be built.

## 2 · Coding agents can tackle robotics tasks — 1:15 (clock 1:35)

*(Video: the door segment from the blog teaser, with Claude Code's agent log on the right; captions removed. Loops.)*

Coding agents can already tackle robotics tasks. In this example, we give Claude Code a simple command, asking it to open the door in front of the robot and enter the room. On the right you can see the agent's log, where it asks for camera images, looks at them, and decides what to do next. It doesn't have a door detector or a scene-aware obstacle planner, so it uses the robot's sensing feedback and our control service to look through the cameras, move a hand, turn the head, open the gripper, and step the base.

With just these tools, it finds the handle in the image, moves its hand in front of the handle, presses it down, pushes the door open, and drives into the room. The task succeeds, but keep in mind that this video is sped up, and the real run took several minutes.

## 3 · But they can also be unreliable — 0:45 (clock 2:20)

*(Video: the three-panel segment from the blog teaser: long pauses, unsafe contact, precision failures; captions removed. Loops.)*

At the same time, these agents can also be quite unreliable. Sometimes the agent thinks for more than a minute before it makes the next move, sometimes the robot collides with the rack, and sometimes it misses a precise placement so the bowl hits the rack.

So we wanted to look closely at what is actually going on inside these runs. I'll also tell you up front where I want to end up, which is that a robot should be able to finish, recover, and stop safely while its model is still thinking.

## 4 · So we investigate how coding agents address robotics tasks — 1:35 (clock 3:55)

*(Videos: the three task clips from the blog, played at speeds that give each about 40 s, looping.)*

Together with Yi Wu, we studied how coding agents approach robotics tasks, using Claude Code with Opus 5.5 and Codex with GPT-6 Astra. We gave them three tasks, which are putting fruit into a basket, placing a bowl on a rack and bringing it back to the table, and going through a door.

The agent can only control the robot through a few MCP tools, which let it take a look with depth, move a hand, turn the head, use the gripper, and step the base. Every motion goes through our control service, which solves the inverse kinematics and checks joint limits and self-collision. There is no object detector and no scene-aware planner, so if the agent wants to move above the banana, it has to find the banana in the image and compute the pose by itself.

`[click]` Each task has two stages. In the learning stage, the agent sees the task for the first time, builds the tools it is missing, solves the task, and saves what worked. In the operating stage, a fresh session without any memory reuses what was saved and does the task again, once in the same scene and once after we rearrange the objects.

## 5 · Successful execution still takes minutes — 1:30 (clock 5:25)

*(Chart: mean time and cost per run, learning vs execution, both models.)*

Let me start with the good news, which is that both models succeeded in every fruit and door trial. The bowl-rack task needs more precise contact, and with the original tools neither model succeeded, and this video shows a typical failure where the bowl misses its placement and hits the rack.

Learning a task took about 4 to 13 minutes and cost about 2 to 9 dollars, but this cost is paid only once, while execution is paid every time the robot does the task.

`[click]` And execution is still slow. With Opus, one fruit takes about two and a half minutes and a dollar twenty, and one door takes about five minutes and two dollars. That means clearing a table with twenty objects would take close to an hour and about twenty-five dollars, and going through five doors to come and find you would take about twenty-five minutes and ten dollars. With Astra, clearing the same table would take more than three hours and almost ninety dollars.

So next, we looked at what the agent is actually doing during a run.

## 6 · Observe-think-act — 1:00 (clock 6:25)

*(Video: the teaser's observe–think–act section, fruit task, third-person and head camera with the loop tracker. Loops.)*

Inside a run, the agent works in a loop. It first observes by reading the camera image and finding the banana and the basket, then it thinks about how to approach, and then it acts by moving toward the banana.

However, sending a command doesn't guarantee the result, and in this case the move doesn't reach its target. So the agent looks at the result, checks whether the move worked, chooses the next move, and retries the same target, and the retry fails as well.

The agent keeps repeating this observe, think, and act loop, so the natural question is how the time is split between these three parts.

## 7 · Thinking Time > Action Time — 1:15 (clock 7:40)

*(Chart animates in: the split of task time per model, then what fills the think time. Successful fruit and door runs, original tools, 12 runs per model.)*

In the successful fruit and door runs, the robot is moving only 20 to 36 percent of the time, which is about a third for Opus and about a fifth for Astra. Almost all of the remaining time is the model thinking between steps. Fixed sleeps add a bit more, about 12 percent for Opus, while the tool calls themselves, such as taking an image or running a script, are only one to two percent.

`[click]` To understand what fills the thinking time, we labelled each pause by what the model did right after it. Most pauses end with the model deciding the next action, which is 28 percent of the total task time for Opus and 38 percent for Astra. The rest end with checking the result again, writing geometry code, re-reading the saved skill, or deciding to wait.

So in these runs, the pace of the task is set by the model's thinking rather than by the robot's motion.

*(Notes, not for the slide: this tags each pause by the next step, so it includes harness latency and output writing. Astra logs tool start and end together, so its code run time sits inside these pauses; its think share is an upper bound. Small sample: 6 runs per task and model.)*

## 8 · 126 seconds for a 6.5 cm correction — 1:15 (clock 8:55)

*(Video: the 126-second check at 8×, with the agent's log appearing line by line and a progress bar filling from 0:00 to 2:16.)*

Here is one of those pauses in detail, from a run that already had a saved plan. The hand has just moved above the basket, and if you follow the log, you can see the agent take one observation and save it, write a check of the object sizes, compare target projections, fit the basket rim at four different heights, check how the banana spans the opening, and crop the image to take another look. After 126 seconds of this, it asks for a 6.5 centimeter correction to the side.

`[click]` *(Video: fixed sleep from motion start, real time, with the log and a motion · sleep · response bar.)* Waiting also wastes time, because after starting a motion the agent chooses how long to sleep. In this example the motion ends at 4.2 seconds, but the sleep only returns at 6.6 seconds, and the next command comes at 8.6 seconds.

## 9 · Saved skills still need model judgment — 1:20 (clock 10:15)

*(Video: saved skill files and helpers.)*

The agents also build and save their own tools. They write geometry helpers, for example to turn a pixel into a 3D point, and code for rotation math. They write a planner that keeps earlier decisions, such as the 45-degree tilted waypoint the agent added after the controller refused a direct rotation. And they write a skill file with the steps, the checks, and the lessons learned from failed motions.

But the model still makes many of the important decisions itself. It picks the targets in the image, it chooses how the fingers make contact with the object, and it decides how to respond to feedback, for example by retrying when the first lift fails and by locating the basket again from a newer observation.

`[click]` Reusing a saved skill does help. On average, it reduces the task time by about a third for Opus, but only by about ten percent for Astra, because Astra's reuse runs still contain a lot of fresh geometry checks.

## 10 · Seeing danger is not stopping — 1:35 (clock 11:50)

*(Videos: the door contact, head and wrist; on click, the other three failures as looping clips.)*

This kind of judgment matters most for safety. In this trial, the agent writes that there is high force on the arm and that it should retract. But sixteen seconds later, it asks to move another 15 centimeters forward and describes the arm as a "bumper", and it only asks to retract 48 seconds after it first noticed the risk.

`[click]` We also saw three other patterns. In one, the hand touched the table during a grasp and the agent never mentioned it. In another, the agent pushed on a latched door and treated it as progress. And in the third, the intervention came too late, so the arm hit the rack and the operator had to stop the robot. In these cases, the motions still reported normal completion.

This means that task success and normal motion feedback don't tell you whether a run was safe.

There was one more case from a session outside these logs, where the agent gave an angle in degrees while the tool expected radians. On a robot, a unit mistake like this is not a small typo, because it produces a rotation about 57 times larger than intended.

*(Notes: the unit error was observed by the speaker during the experiments; it is not in the analysed logs. 57× is just the unit ratio, 1 rad ≈ 57.3°.)*

## 11 · What we learned so far — 0:50 (clock 12:40)

Let me summarize what we have seen so far.

The agent runs a ReAct-style loop, where it observes, thinks, acts, and repeats.

It spends much more time thinking than acting, and the robot is moving only 20 to 36 percent of the time.

It builds and saves helpers for geometry and planning, but it keeps the key judgments for itself, such as what to target, how to make contact, and what to do after feedback.

And it can make unsafe moves even when it recognizes the risk.

In other words, the robot today can only finish, recover, or stop once the model has finished thinking.

## 12 · What if we empower the coding agent? — 0:25 (clock 13:05)

*(Section slide: what if we empower the coding agent? 1. Give it more tools. 2. Ask it to build a simulation.)*

A natural next question is what happens if we give the agent more help, and we tried two things. The first was giving it more robotics tools, and the second was asking it to build a simulation and rehearse there before working on the real robot.

## 13 · What we added — 0:45 (clock 13:50)

*(Diagram: the original MCP tools and control service, then the four added capabilities.)*

Before the change, the agent could take a look, move a hand, turn the head, use the gripper, and step the base, all through a control service that solves inverse kinematics and checks joint limits and self-collision.

`[click]` We added four capabilities on top of that. We added segmentation with SAM 3, so the agent no longer has to pick pixels by hand, a search for reachable poses, waypoint checks against the table and obstacles, and whole-body motion with arm and torso waypoints.

## 14 · More tools did not consistently help — 0:55 (clock 14:45)

*(Table: success, mean time and mean cost, original vs expanded tools, per model; then tool usage.)*

The extra tools did not help as much as we expected. Opus still succeeded in every trial, but Astra dropped to 83 percent, and on the door task it went from 100 percent to about 67 percent. Among the successful runs, both time and cost went up, with Opus going from 4.4 to 4.7 minutes and Astra from 10.6 to 12.9 minutes.

`[click]` This is not because the agents ignored the new tools. Every run used the waypoint checks and the whole-body motion, and 22 of the 24 runs used segmentation, so the question is why the runs didn't get faster.

## 15 · Added tools shifted effort into checking — 1:00 (clock 15:45)

*(Chart: share of task time, original vs expanded tools: act, deciding the next action, and checking · querying · computing.)*

The reason is that the time between steps shifted to other work. With the original tools, about a third of the task time ended in deciding the next action, and about a quarter went to checking, querying, and computing. With the added tools, checking, querying, and computing grew to almost half of the task time, while deciding dropped to about a fifth. The largest new item is preparing waypoint checks and reachability queries, which takes 14 percent of the task time for Opus and 25 percent for Astra.

So adding tools doesn't remove the work, it moves the work somewhere else. A tool only helps if its result feeds directly into the next decision, and I think this is an engineering problem about how we package tools into skills that the agent can actually rely on.

*(Notes: successful fruit/door runs; original n = 24, expanded n = 22. "Checking · querying · computing" = all think time that did not end in an action decision, plus the run time of observe/check/query calls. Part of the time before a waypoint check is really motion design; counted that way, the shift is smaller but still there.)*

## 16 · Build a simulation first — 0:30 (clock 16:15)

*(Section slide with the added instruction.)*

The second thing we tried was simulation. For the bowl task, which no agent had solved, we added one instruction to the prompt, telling the agent that it can build a physics simulation of the real scene, run the whole solution there first, and then do it on the real robot, and that Blender and Isaac Sim are already installed.

## 17 · How the agent builds the scene — 0:40 (clock 16:55) [CUT-A]

*(Video: the agent's Isaac Sim scene, full rim-pinch rehearsal.)*

The agents built the simulated scene by themselves. They fitted the table plane from depth, and they measured the rack rails and dowels from the depth data and the images, while we provided the robot models. However, everything related to contact, such as the bowl's mass, the friction, and the gripper strength, had to be chosen by the agent, and one run's own notes describe these as "physical values assumed".

## 18 · Rehearsal changes the grasp strategy — 1:20 (clock 18:15)

*(Videos: three rehearsals side by side: no lift, slip, success. One pane is in focus at a time; the others dim.)*

After building the scene, the agent rehearses in it. In the run shown here, its first plan was to grasp the bowl across its diameter, and as you can see in the left video, closing the gripper pushes the bowl away, so the bowl never lifts.

`[click]` In the middle video, the agent shifted the grasp, lowered the hand, and opened the gripper less, but the bowl still slips out.

`[click]` After about 42 minutes, it switched to a rim pinch, and in the right video, the seventh run lifts the bowl successfully. After that, the agent moved on to the real robot.

`[click]` In terms of cost, this run spent about 47 minutes on observation and simulation and about 2 minutes on the real robot, and across the four standard simulation runs, one of them succeeded.

## 19 · Simulation assumptions can hide failures — 1:05 (clock 19:20) [CUT-A]

We noticed three more things about how the agents used simulation.

First, the agents built simulations for physics rather than for visuals. All four standard runs ran without a window or rendering, and the agents spent their effort on contact, including friction, grasping, support, and release.

Second, the simulated physics can be wrong in ways that the agent itself chooses. One run attached the bowl to the hand with a fixed joint, so the rehearsal passed while the real bowl stayed on the table. In another run, the real hand touched the bowl earlier than the simulation predicted.

Third, a failed rehearsal doesn't always change the plan. In one run, the bowl tilted to 68 degrees in simulation, but the agent called it a "sim artifact" and went to the real robot anyway, where the rack was dragged out of place.

## 20 · What our experiments show — 0:40 (clock 20:00)

So what do our experiments show? They show that coding agents can really do some robotics tasks, and that part is real.

But there are still three main issues. The first is time, because every step waits for the model. The second is safety, because the agent can recognize danger and still not stop. And the third is motor skills, because there are no reliable skills for the agent to call, so it has to rebuild them every time. Let me go through each of them briefly and compare them with coding tasks.

## 21 · Model latency cannot set the control rate — 0:55 (clock 20:55)

*(Chart: one frequency axis in hertz. Large models from OpenRouter on the left, robot policies on the right.)*

The first issue is time, which I show here as frequencies. On the left are large models, with their response times measured by OpenRouter this week. A vision-language model like Claude Opus 5.5 takes about 3 seconds to answer, the fastest decision models take about a tenth of a second, and one agent step in our runs takes between 6 and 12 seconds.

`[click]` On the right are the policies that people actually run on robots, which work at about 5 to 50 hertz. This means the models that can reason about a scene are one to three orders of magnitude slower than what robot control needs.

`[click]` For a coding task this is fine, because the world waits while the model thinks, but for a robot the world keeps moving while the model is thinking.

*(Notes: model latencies are OpenRouter's average end-to-end latency for the best provider over the past week (the per-provider figures OpenRouter labels 'Avg'), read Nov 11, 2026 (openrouter.ai/<model>/performance; data in deck/data/openrouter_latency_2026-11-11.json). On the chart but not read aloud: GPT-6 Astra 7.4 s, Gemini 4 Carbon 24.3 s, DeepSeek V4.1 Flash 0.96 s, GPT-6 Luna Decisions 0.26 s, Jev 1.14 0.11 s. They reflect OpenRouter's general traffic, not our robot prompts; reasoning models' end-to-end time depends on output length. VLM = vision-language model; decider = structured decision model. Agent steps from the Anatomy runs: Opus 5.6 s, Astra 12.1 s. π0.5: "at 50 Hz (with action chunking)" (arXiv 2504.16054); SONIC: "The policy loop runs at 50 Hz" (arXiv 2511.07820); Fast-WAM: 190 ms inference latency (arXiv 2603.16666), ~5 Hz is our conversion.)*

## 22 · Safety needs a local response — 0:30 (clock 21:25)

The second issue is safety. When a coding agent breaks something, you can simply revert the change with git.

`[click]` A robot, on the other hand, has no undo. As we saw earlier, our agent only asked to retract 48 seconds after it noticed high force, but stopping needs to happen within milliseconds, without waiting for the model.

## 23 · Plans depend on reliable motor skills — 0:35 (clock 22:00)

The third issue is motor skills. A coding agent has precise and composable basic skills, such as writing a file or running the tests.

`[click]` A robot's motor skills are continuous and contact-rich, and very few of them are mature. In our runs, the agent had to build its own geometry helpers, and it never solved the bowl task with the original tools.

## 24 · Also different: input and checking — 0:30 (clock 22:30)

There are two more differences. A coding agent reads exact text, while a robot has to read noisy camera images and joint states.

`[click]` And a coding agent has tests that tell it whether it is done, while a robot has no built-in signal for "done", which is something I will come back to later.

## 25 · We need an AI-native robot system — 0:30 (clock 23:00)

So a large model alone is not enough, and we need a whole system built around it, which I call an AI-native robot system. The goal of this system is to let the robot finish, recover, and stop safely while the model is still thinking.

## 26 · An AI-native robot system — 2:35 (clock 25:35)

*(Diagram builds: cloud and device; then each middle level with its purpose and rate; then the brain's links to every level; then what's inside; then one failure traced through the levels; then memory is highlighted.)*

This is the design we are building at Dexmate, and I'll start with the two ends. In the cloud, there is a robot brain, which is a large model that understands the task and breaks it into subtasks. On the robot, there is a robot service, which drives the hardware safely. The brain sends requests down, and the service sends the robot state back up.

`[click]` But a large model can't talk to the motors directly, because, as we just saw, it is too slow. So we add levels on the device, and I'll use motion as the example. The first level is task execution and grounding, which plans the motion at about 0.5 to 10 hertz.

`[click]` The next level is motion tracking, which tracks that motion with reusable, general policies at about 20 to 100 hertz. Around these two levels, the brain runs slowly, at less than once every two seconds, while the robot service runs at 200 to 1000 hertz.

`[click]` The brain is also not only at the top of a chain, because it can reach every level directly when it needs to.

`[click]` Inside the brain, there is a large model such as GPT, Claude, Gemini, or Muse, together with memory and task tracking, and the lower levels contain skill selectors, VLAs, planners, policies, and collision avoidance.

`[click]` To make this concrete, let's replay the bumper moment from earlier in this system. First, when the arm meets high force, the robot service stops it within milliseconds. Second, the task monitor notices that the push failed, and the skill tries to recover by backing off and approaching again. Third, only if that recovery fails does the brain get a short summary and replan. In this way, each correction is handled by the fastest level that is able to handle it.

`[click]` We have started studying some parts of this system, and the first one is memory.

## 27 · What should a robot remember? — 1:15 (clock 26:50)

*(Video: real robot, memory demo, with two captions: what the robot saw earlier, and what it is asked later. Reference on the slide.)*

In MeMoREval, the robot first walks through a building and sees things happen, without knowing what it will be asked later, and then a fresh agent has to answer questions and act using only its memory. In this real-robot demo, the robot first moves a lemon to another table, and later it is asked to bring the apple that was to the lemon's right, so it has to remember where the lemon used to be.

The short answer from this study is that the robot should keep the camera frames rather than text descriptions of them. Frames reached 70 percent task success compared with about 60 percent for the best descriptions, and frames together with a scene graph reached 75 percent. Frames were also cheaper to write, because a description has to decide what matters before the question is known, and it often drops exactly the details that are needed later.

*(Notes: MeMoREval, arXiv 2610.12561; Gemini 3.7 Flash, 53 simulated tasks, 5 memory backends × 3 seeds; descriptions 56 / 59 / 60% at 64 / 256 / 1024 tokens; write cost $9.30 vs $11.08–12.09 per 1,000 steps. Mostly simulation; real robot: two demonstrations.)*

## 28 · An AI-native robot system — 0:15 (clock 27:05)

*(The same diagram, settled; now the task monitor and task tracking are highlighted.)*

Coming back to the system, the second part we studied is task tracking, which decides whether the task is done.

## 29 · How does a robot know it’s done? — 1:20 (clock 28:25)

*(Video: red mug; the track marks when the task is first done and when the robot undoes it. Reference on the slide.)*

Today's robot models don't know when to stop. This is π0.5 in simulation with automatic stopping turned off, and you can see that it puts the mug upright, which completes the task, but then it keeps moving and knocks the mug over again. So we need a model that tracks the progress of the task and says when it is done.

`[click]` We tested how well current models can do this. The best one, GPT-6 Astra, was right 86 percent of the time, but it took about 4 seconds and about 22 dollars per thousand checks. The fast and cheap models were only around 50 to 60 percent accurate, which is close to guessing.

`[click]` Interestingly, when we gave Astra the simulator's facts instead of camera images, its accuracy went up to 98 percent, which suggests that the hard part is not the judgment itself but seeing the scene correctly.

*(Notes: The Unstoppable Robot; RoboLab with π0.5, 500 moments from 150 runs; balanced accuracy. GPT-6 Astra direct 86.0% at 4.01 s, $22.54 per 1,000 checks (50-case subset); Gemini 3.8 Flash 81.4% at 5.50 s, $4.50/1k; DeepSeek V4.1 Flash 51.2% at 2.13 s; GPT-6 Luna 49.8% at 0.28 s; Jev 1.14 59.2% at 0.49 s; Perplexity Decider 64.2% at 0.77 s. With simulator facts instead of images, Astra 98.0%, Gemini 94.8%: a changed-evidence diagnostic, not a deployable judge. Offline, in simulation.)*

## 30 · A renaissance of robotics problems — 1:20 (clock 29:45)

*(Discussion slide. Two sides: what large models now take on, and the robotics problems that come back.)*

I'd like to end with a feeling rather than a result. For many years, much of the excitement in our field was about getting robots to understand language, tasks, and scenes. Large models are now taking on much of that semantic side, including understanding the request, planning, and judging what to do next.

`[click]` And this brings us back to the classic robotics problems, such as how to build a reliable system around a model that is slow and sometimes wrong, how to learn motor skills that are general and dependable, and how to execute quickly and safely every time.

So I think we are seeing a renaissance of robotics problems, where the model handles the semantics and the hard work is, once again, robotics.

`[click]` And this brings me back to the point I started with, that a robot should be able to finish, recover, and stop safely while its model is still thinking.

## 31 · Thanks — 0:25 (clock 30:10)

I'd like to thank Yi Wu, Junxiang Wang, Yuchen Liu, and everyone at Dexmate. My email and website are on the slide, and I'd be happy to continue the discussion during the coffee break, especially on the question of which corrections a skill can handle on its own and what evidence should send the problem back to the model.

---

## Timing summary

Computed at 140 words/min, plus ~4 s per slide change or click and short pauses inside videos: **30:10**. Expect a little more with natural pauses. Timing is a guide for rehearsal, not a hard target.

| Part | Slides | Time | Clock at end |
|---|---|---:|---:|
| Open: can tackle, but unreliable | 1–3 | 2:20 | 2:20 |
| Anatomy: setup + results | 4–5 | 3:05 | 5:25 |
| Agent behavior | 6–10 | 6:25 | 11:50 |
| What we learned so far | 11–11 | 0:50 | 12:40 |
| More tools | 12–15 | 3:05 | 15:45 |
| Simulation | 16–19 | 3:35 | 19:20 |
| Three issues, compared with coding → need an AI-native system | 20–25 | 3:40 | 23:00 |
| AI-native system + memory + task tracking | 26–29 | 5:25 | 28:25 |
| Discussion + thanks | 30–31 | 1:45 | 30:10 |

## Cut plan

- **Cut A — to about 28:25 (−1:25):** hide slide 17 (scene building) and 19 (other simulation findings).
- **Cut B — to about 27:15 (cut A plus −1:10):** slide 8 → drop the fixed-sleep click (−0:25); slide 10 → drop the click with the three other patterns (−0:20); slide 9 → drop the reuse click (−0:15); slide 5 → drop the learning-cost sentence (−0:10).
- **Never cut:** 2, 3, 4, 7, 8 (first part), 10 (first part), 11, 14, 15, 18, 20, 21, 22, 23, 25, 26 (including the failure walk-through), 27, 29, 30.
- In presenter view, press `H` to hide/unhide the current slide. Hidden slides are skipped.

## Checkpoints (presenter timer)

| Reach slide | Full | Cut A | If late by > 45 s |
|---|---:|---:|---|
| 4 Setup | 2:20 | 2:20 | Skip slide 5's click (scale table) |
| 12 More tools | 12:40 | 12:40 | Skip slide 14's click (tool usage) |
| 20 What our experiments show | 19:20 | 17:35 | Skip slide 24 |
| 26 AI-native robot system | 23:00 | 21:15 | Keep 27 and 29 to the TL;DR line each |

## Rehearsal plan (talk is Thu Nov 12)

- **Mon Nov 9 evening:** read the full script aloud once with the deck. Record the time at each checkpoint. Mark any sentence that feels unnatural and rewrite it in your own words.
- **Tue Nov 10:** two full runs standing up, with the presenter timer. Run 1 full length. Run 2 with cut A. Note where you speed up; add a pause mark there.
- **Wed Nov 11:** confirm with the organizers whether Q&A is inside the 20 minutes. One full run on the laptop and display adapter you'll use. Check videos play from the local folder with Wi-Fi off. Then one run of only slides 20–29 (the densest part; practise the slide 26 failure walk-through without reading the boxes).
- **Thu Nov 12 morning:** one relaxed run with the cut that matches the slot. Don't change content after this run.
- **On stage:** if you're nervous, you'll speak faster. The full version at nervous speed runs about 10% shorter. Watch the timer at slide 20; that's the decision point.
