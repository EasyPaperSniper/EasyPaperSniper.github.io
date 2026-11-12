# CoRL 2026 talk — short script (~15:00)

Same slides and clicks as the full script, with slides 17 and 19 hidden (open with `?cut=A`). Estimated 15:00 at 140 words/min plus video pauses; expect 1–2 min more with natural pauses.

## 1 · Title — 0:20 (clock 0:20)

Hi everyone, I'm Tianyu, founding scientist at Dexmate, and today I'll share what we learned when we let coding agents control a real robot, and how that led to the design of our AI-native robot system.

## 2 · Coding agents can tackle robotics tasks — 0:35 (clock 0:55)

Coding agents can already tackle robotics tasks. Here we give Claude Code a simple command to open the door and enter the room, and it uses camera images and our robot control service to find the handle, press it down, push the door open, and drive in.

## 3 · But they can also be unreliable — 0:20 (clock 1:15)

But these agents can also be unreliable, because they sometimes think for more than a minute before moving, collide with their environment, or miss a precise placement. So we wanted to look closely at what is going on inside these runs.

## 4 · So we investigate how coding agents address robotics tasks — 0:55 (clock 2:10)

We tested Claude Code with Opus 5.5 and Codex with GPT-6 Astra on three tasks, which are fruit into a basket, a bowl onto a rack, and going through a door. The agent controls the robot only through a few basic tools and our control service, without any object detector or scene-aware planner, so it has to find objects in the image and compute the poses by itself.

`[click]` In the learning stage, the agent solves the task for the first time and saves what worked, and in the operating stage, a fresh session starts without the previous context but with the saved skills, and does the task again.

## 5 · Successful execution still takes minutes — 0:40 (clock 2:50)

Both models succeeded in every fruit and door trial, but neither solved the bowl-rack task with the original tools, and this is a typical failure where the bowl hits the rack.

`[click]` The bigger issue is that execution stays slow, since one fruit takes Opus about two and a half minutes and one door about five minutes, so clearing a table of twenty objects would take close to an hour.

## 6 · Observe-think-act — 0:35 (clock 3:25)

Inside a run, the agent works in a loop where it observes the camera image, thinks about the next move, and acts, and when a move misses its target, it looks again and retries. So the question is how the time is split across these steps.

## 7 · Thinking Time > Action Time — 0:35 (clock 4:00)

In the successful runs, the robot is moving only 20 to 36 percent of the time, and most of the rest is the model thinking between steps.

`[click]` Most of that thinking ends with deciding the next action, and the rest goes to re-checking results, writing geometry code, or deciding to wait, so the model's thinking, rather than the robot's motion, sets the pace.

## 8 · 126 seconds for a 6.5 cm correction — 0:45 (clock 4:45)

Here is one pause in detail, where the agent takes one image and then checks object sizes, fits the basket rim, and crops the image again, and after 126 seconds it asks for a 6.5 centimeter correction to the side.

`[click]` Waiting also costs time, because here the motion ends at 4.2 seconds but the next command only comes at 8.6 seconds.

## 9 · Saved skills still need model judgment — 0:30 (clock 5:15)

The agents build and save geometry helpers, planners, and skill files, but the model still decides the targets, how to make contact, and how to respond to feedback.

`[click]` Reusing a saved skill helps, cutting the task time by about a third for Opus but only about ten percent for Astra.

## 10 · Seeing danger is not stopping — 0:45 (clock 6:00)

This judgment matters most for safety. Here the agent writes that there is high force on the arm and it should retract, but it then pushes another 15 centimeters forward, calls the arm a "bumper", and only asks to retract 48 seconds later.

`[click]` We also saw unmentioned table contact, pushing on a latched door as if it were progress, and a collision where the operator had to stop the robot, and in these cases the motions still reported normal completion.

## 11 · What we learned so far — 0:30 (clock 6:30)

So, to summarize, the agent runs an observe, think, and act loop, it spends most of its time thinking, it keeps the key judgments for itself, and it can make unsafe moves even when it sees the risk, which means the robot can only finish, recover, or stop once the model is done thinking.

## 12 · What if we empower the coding agent? — 0:15 (clock 6:45)

We then asked whether more help would fix this, and we tried two things, giving the agent more robotics tools and asking it to rehearse in simulation.

## 13 · What we added — 0:20 (clock 7:05)

The agent originally had only basic look, move, and gripper tools.

`[click]` We added segmentation, a reachable-pose search, waypoint collision checks, and a whole-body motion planner.

## 14 · More tools did not consistently help — 0:35 (clock 7:40)

The extra tools did not consistently help, since Astra's success dropped to 83 percent, and the successful runs became slower and more expensive for both models.

`[click]` The agents did use the new tools in almost every run, so the question is why they didn't get faster.

## 15 · Added tools shifted effort into checking — 0:20 (clock 8:00)

The time between steps simply moved to other work, and checking, querying, and computing grew to almost half of the task time. So tools don't remove the work, they move it, and a tool only helps if its result feeds directly into the next decision.

## 16 · Build a simulation first — 0:20 (clock 8:20)

The second thing we tried was simulation, where for the bowl task we told the agent it could build a physics simulation of the scene with Isaac Sim and rehearse its whole solution there first.

## 18 · Rehearsal changes the grasp strategy — 1:05 (clock 9:25)

In this run, the agent first tried to grasp the bowl across its diameter, and as you can see on the left, the bowl never lifts.

`[click]` In the middle, it adjusted the grasp, but the bowl still slips out.

`[click]` After about 42 minutes it switched to a rim pinch, and the run on the right lifts the bowl, after which the agent moved to the real robot.

`[click]` That run spent about 47 minutes in observation and simulation and only about 2 minutes on the real robot, and only one of the four standard simulation runs succeeded.

## 20 · What our experiments show — 0:20 (clock 9:45)

So our experiments show that coding agents can do some real robotics tasks, but three issues remain, which are time, because every step waits for the model, safety, because the agent can see danger and still not stop, and motor skills, because there are no reliable skills to call.

## 21 · Model latency cannot set the control rate — 0:25 (clock 10:10)

For time, a vision-language model like Opus takes about 3 seconds per answer, and one agent step in our runs takes 6 to 12 seconds.

`[click]` Robot policies run at 5 to 50 hertz, so the models that can reason about a scene are one to three orders of magnitude too slow.

`[click]` A coding task can wait while the model thinks, but on a robot the world keeps moving.

## 22 · Safety needs a local response — 0:20 (clock 10:30)

For safety, a coding agent can simply revert a mistake with git.

`[click]` A robot has no undo, so stopping needs to happen within milliseconds, without waiting for the model.

## 23 · Plans depend on reliable motor skills — 0:20 (clock 10:50)

For motor skills, a coding agent has precise building blocks like writing files and running tests.

`[click]` A robot's skills are continuous and contact-rich, and very few of them are mature yet.

## 24 · Also different: input and checking — 0:20 (clock 11:10)

A coding agent also reads exact text, while a robot reads noisy sensors.

`[click]` And a coding agent has tests, while a robot has no built-in signal for when it is done.

## 25 · We need an AI-native robot system — 0:25 (clock 11:35)

So a large model alone is not enough, and we need an AI-native robot system around it, whose goal is to let the large model drive the robot to finish tasks reliably and efficiently.

## 26 · An AI-native robot system — 1:05 (clock 12:40)

This is the system we are building at Dexmate. In the cloud, the robot brain is a native agent system, with a large model at its core and a harness for memory, context management, and task tracking, and it turns the user's task into an explicit plan at less than 0.5 hertz.

`[click]` On the device, task execution and grounding turns language subtasks into motor-skill commands at 1 to 10 hertz, using VLAs and motion and navigation planners, while a subtask monitor tracks progress.

`[click]` Below it, primitive skills solve local tasks such as motion tracking at 20 to 100 hertz.

`[click]` And the robot service handles local collision avoidance and self-collision at 200 to 1000 hertz.

`[click]` We have started studying parts of this system, beginning with memory.

## 27 · What should a robot remember? — 0:35 (clock 13:15)

In MeMoREval, a robot sees things happen before it knows what it will be asked, for example moving a lemon and later being asked for the apple that was to the lemon's right. We found that keeping camera frames works better than text descriptions, reaching 70 percent task success compared with about 60, and 75 percent with a scene graph added.

## 28 · An AI-native robot system — 0:15 (clock 13:30)

The second part we studied is task tracking, which decides whether the task is done.

## 29 · How does a robot know it’s done? — 0:50 (clock 14:20)

Today's robot models don't know when to stop, and here π0.5 puts the mug upright, which completes the task, but keeps moving and knocks it over.

`[click]` The best model we tested, GPT-6 Astra, judged completion correctly 86 percent of the time but took about 4 seconds per check, while the fast models were close to guessing.

`[click]` When we gave Astra the simulator's facts instead of images, it reached 98 percent, which suggests the hard part is seeing the scene rather than judging it.

## 30 · A renaissance of robotics problems — 0:30 (clock 14:50)

To close, large models are now taking on much of the semantic side of robotics, like understanding requests and planning.

`[click]` This brings us back to classic robotics problems, such as building reliable systems around slow models, learning dependable motor skills, and executing quickly and safely, so I see this as a renaissance of robotics problems.

## 31 · Thanks — 0:10 (clock 15:00)

I'd like to thank all my collaborators who took part in these studies, and I'm happy to continue the discussion after the talk.
