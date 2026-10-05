import { KnowledgeObject, ConnectionPattern } from '../types/knowledge';

export const INITIAL_KNOWLEDGE_OBJECTS: KnowledgeObject[] = [
  // 1. OPEN QUESTION: "How do I stick to a workout?"
  {
    id: 'q_workout_1',
    title: 'How do I stick to a workout?',
    type: 'question',
    summary: 'Investigating why workout adherence collapses and how initiation friction can be systematically eliminated.',
    content: `Workout consistency has historically broken down not during the workout itself, but in the 15 minutes immediately preceding it. The friction lies in initiation negotiation.

Key questions:
- What is the minimal viable session that maintains identity?
- Does temporal rigidity (exact same time) outperform situational flexibility?
- How much initiation resistance is caused by micro-decisions?`,
    topics: ['Physical Practice', 'Decision Friction', 'Human Behavior', 'Habit Architecture'],
    currentUnderstanding: 'Consistency is almost entirely dictated by initiation threshold friction rather than peak motivation. When workouts require micro-decisions (selecting exercises, choosing duration, negotiating outfit or playlist), mental bargaining triggers postponement. Enforcing a non-negotiable 20-minute cap and an invariant predetermined protocol eliminates initiation resistance.',
    hypotheses: [
      {
        id: 'hyp_1',
        statement: 'Shorter workouts (<=20 min) make me significantly more consistent over a 14-day window.',
        status: 'supported',
        confidence: 'high',
        evidenceNotes: 'Tested in 14-day trial. Achieved 11/14 sessions compared to 4/14 on previous 60-min programs.',
        experimentIds: ['exp_20min_workout'],
        supportingNoteIds: ['obs_tiny_decisions', 'claim_decision_friction'],
        lastTestedAt: '2026-09-28',
      },
      {
        id: 'hyp_2',
        statement: 'Preparing the workout sequence the night before and removing all in-session decisions eliminates resistance.',
        status: 'supported',
        confidence: 'high',
        evidenceNotes: 'Observed that zero choices at 07:00 prevented the rationalizing brain from negotiating.',
        supportingNoteIds: ['idea_remove_decisions', 'claim_decision_friction'],
        lastTestedAt: '2026-09-30',
      },
      {
        id: 'hyp_3',
        statement: 'Working out at the exact same hour every day creates an automatic physiological anchor.',
        status: 'promising',
        confidence: 'moderate',
        evidenceNotes: 'Held 07:30 consistent for 10 days; sleep disruption on travel days caused missed sessions.',
        lastTestedAt: '2026-09-22',
      },
      {
        id: 'hyp_4',
        statement: 'Tracking binary consistency (did I show up for 20 min?) instead of performance metrics preserves intrinsic motivation.',
        status: 'promising',
        confidence: 'moderate',
        evidenceNotes: 'Removing weight and rep logs reduced cognitive dread before sessions.',
        lastTestedAt: '2026-09-18',
      },
      {
        id: 'hyp_5',
        statement: 'High-intensity progressive overload from day one builds momentum faster.',
        status: 'rejected',
        confidence: 'low',
        evidenceNotes: 'Failed in August trial. Excessive initial soreness created subconscious dread by Day 3.',
        lastTestedAt: '2026-08-14',
      },
    ],
    connectedObjectIds: ['exp_20min_workout', 'claim_decision_friction', 'obs_tiny_decisions', 'idea_remove_decisions'],
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-10-02T14:30:00Z',
    revisitCount: 7,
    lastRevisitedAt: '2026-10-03T18:00:00Z',
    isStarred: true,
  },

  // 2. EXPERIMENT: 20-minute workouts for 14 days
  {
    id: 'exp_20min_workout',
    title: '20-minute workouts for 14 days',
    type: 'experiment',
    summary: 'Empirical test of a low-threshold daily kettlebell and mobility routine.',
    content: `Objective: Test whether setting the bar artificially low (20 minutes maximum, low heart-rate ceiling) overcomes the chronic avoidance pattern seen with standard 45-60 minute workouts.

Setup:
- Predetermined 4-exercise circuit (goblet squats, kettlebell press, Romanian deadlifts, hanging bar hold).
- Kitchen timer set to exactly 20:00.
- Mandatory stop when the timer rings, regardless of set completion.`,
    topics: ['Physical Practice', 'Decision Friction', 'Habit Architecture'],
    provenance: 'tested',
    confidence: 'high',
    relatedQuestionId: 'q_workout_1',
    experimentDetails: {
      protocol: '20-minute predetermined kettlebell and mobility session daily at 07:30 for 14 consecutive days.',
      durationDays: 14,
      result: 'Completed 11 out of 14 days (78% adherence vs historical 30% baseline on 45-minute gym visits).',
      observation: 'I resisted starting much less often. Knowing the session was strictly capped at 20 minutes eliminated the subconscious dread of physical exhaustion.',
      status: 'completed',
      completedDate: '2026-09-28',
    },
    connectedObjectIds: ['q_workout_1', 'claim_decision_friction', 'obs_tiny_decisions'],
    createdAt: '2026-09-14T08:00:00Z',
    updatedAt: '2026-09-29T11:00:00Z',
    revisitCount: 4,
    lastRevisitedAt: '2026-10-01T09:20:00Z',
    isStarred: true,
  },

  // 3. SOURCE: The Girl with the Dragon Tattoo (Movie)
  {
    id: 'src_dragon_tattoo',
    title: 'The Girl with the Dragon Tattoo',
    type: 'source',
    summary: 'David Fincher’s 2011 film adaptation. Rich study of institutional silence, unearned power, and asymmetric competence.',
    content: `A masterclass in tension, forensic investigation, and character autonomy.

Key reflections:
- Lisbeth Salander operates with radical self-sufficiency because external systems consistently betrayed her.
- Mikael Blomkvist represents institutional journalism: principled but bound by rules that the corrupt ignore.
- The visual pacing emphasizes isolation, cold procedural rigor, and silence.`,
    topics: ['Human Behavior', 'Power Dynamics', 'Social Dynamics', 'Trust & Betrayal'],
    medium: 'movie',
    creator: 'David Fincher',
    year: '2011',
    extractedItems: {
      noticed: [
        'People reveal themselves differently when they feel watched versus when they believe they hold unchecked institutional power.',
        'Competence combined with absolute silence disarms people who rely on social bravado and posturing.',
        'Institutional predators rely on the politeness and conflict-avoidance of ordinary colleagues.',
      ],
      ideas: [
        'Institutional rot survives not because people are oblivious, but because the cost of confrontation is structured to fall solely on the whistleblower.',
        'Procedural thoroughness looks boring until the inflection point where disparate fragments click together.',
      ],
      questions: [
        'Why do hierarchical institutions consistently punish truth-tellers more severely than corrupt incumbents?',
        'How does complete distrust of authority alter an individual’s cognitive processing?',
      ],
      quotes: [
        '"It has taken me forty years to realize that you can’t buy someone who doesn’t want anything."',
        '"Moral indignance is an expensive luxury when you are unarmed."',
      ],
    },
    connectedObjectIds: ['claim_watched_behavior', 'obs_institutional_silence', 'top_human_behavior'],
    createdAt: '2026-09-02T19:40:00Z',
    updatedAt: '2026-09-20T21:15:00Z',
    revisitCount: 5,
    lastRevisitedAt: '2026-09-28T22:00:00Z',
    isStarred: true,
  },

  // 4. CLAIM: Reducing decisions makes me more likely to start repetitive tasks
  {
    id: 'claim_decision_friction',
    title: 'Reducing decisions makes me more likely to start repetitive tasks',
    type: 'claim',
    summary: 'Tested principle: Initiation friction is primarily cognitive selection cost, not physical reluctance.',
    content: `When a task presents more than one branching decision at the point of entry (e.g., "Which document should I open? Which exercise should I do first? What tone should I adopt?"), initiation resistance escalates exponentially.

Pre-committing to an exact sequence shifts the cognitive state from deliberative to purely executive.`,
    topics: ['Decision Friction', 'Creative Flow', 'Physical Practice', 'Human Behavior'],
    provenance: 'tested',
    confidence: 'high',
    evidenceIds: ['exp_20min_workout', 'obs_tiny_decisions', 'idea_remove_decisions'],
    connectedObjectIds: ['q_workout_1', 'exp_20min_workout', 'obs_tiny_decisions', 'idea_remove_decisions', 'note_writing_friction'],
    createdAt: '2026-09-18T10:15:00Z',
    updatedAt: '2026-10-02T16:00:00Z',
    revisitCount: 8,
    lastRevisitedAt: '2026-10-04T12:00:00Z',
    isStarred: true,
  },

  // 5. OBSERVATION: I procrastinate much more when a task requires lots of tiny decisions
  {
    id: 'obs_tiny_decisions',
    title: 'I procrastinate much more when a task requires lots of tiny decisions',
    type: 'observation',
    summary: 'Captured while setting up a new writing workflow in markdown vs formatted word processor.',
    content: `I noticed that I procrastinate much more when a task requires lots of tiny decisions. 

In writing: When I had to decide heading sizes, font styling, and file naming upfront, I delayed starting for 45 minutes. When using an unadorned text buffer with zero choices, I started typing within 30 seconds.

In physical practice: Spending 5 minutes deciding which workout app routine to follow killed my willingness to train.`,
    topics: ['Decision Friction', 'Creative Flow', 'Human Behavior'],
    provenance: 'observed',
    confidence: 'high',
    connectedObjectIds: ['claim_decision_friction', 'idea_remove_decisions', 'q_workout_1', 'exp_20min_workout'],
    createdAt: '2026-09-12T16:45:00Z',
    updatedAt: '2026-09-24T18:00:00Z',
    revisitCount: 6,
    lastRevisitedAt: '2026-10-02T08:00:00Z',
  },

  // 6. IDEA: Removing repetitive decisions reduces friction
  {
    id: 'idea_remove_decisions',
    title: 'Removing repetitive decisions reduces friction',
    type: 'idea',
    summary: 'Design heuristics for routines: Shift all decision-making away from the execution threshold.',
    content: `Any repeated ritual should have its decision tree pruned in advance. 

The ideal workflow:
1. Planning phase (high cognitive energy): Map out the exact sequence.
2. Execution phase (variable cognitive energy): Execute like an automaton without reassessment.
3. Review phase (calm reflection): Audit the outcome and iterate for the next session.`,
    topics: ['Decision Friction', 'Creative Flow', 'Habit Architecture'],
    provenance: 'thought',
    confidence: 'high',
    connectedObjectIds: ['claim_decision_friction', 'obs_tiny_decisions', 'q_workout_1'],
    createdAt: '2026-09-10T11:20:00Z',
    updatedAt: '2026-09-28T09:10:00Z',
    revisitCount: 3,
  },

  // 7. OBSERVATION: People reveal themselves differently when they feel watched
  {
    id: 'claim_watched_behavior',
    title: 'People reveal themselves differently when they feel watched',
    type: 'observation',
    summary: 'Connecting character analysis from Nordic noir cinema to organizational meeting dynamics.',
    content: `When individuals believe their actions are unseen or shielded by structural authority, their genuine hierarchy of values emerges. 

Under explicit scrutiny, behavior aligns with normative expectations. When scrutiny drops or when an actor believes the observer has zero recourse, ethical boundaries dissolve with surprising speed.`,
    topics: ['Human Behavior', 'Power Dynamics', 'Social Dynamics'],
    provenance: 'observed',
    confidence: 'high',
    sourceId: 'src_dragon_tattoo',
    sourceTitle: 'The Girl with the Dragon Tattoo',
    sourceMedium: 'movie',
    connectedObjectIds: ['src_dragon_tattoo', 'obs_institutional_silence'],
    createdAt: '2026-09-04T14:10:00Z',
    updatedAt: '2026-09-25T17:20:00Z',
    revisitCount: 4,
  },

  // 8. OBSERVATION: The cost of confrontation falls on the whistleblower
  {
    id: 'obs_institutional_silence',
    title: 'The cost of confrontation is structured to fall solely on the whistleblower',
    type: 'observation',
    summary: 'Extracted from investigative cinema and corroborated by organizational case studies.',
    content: `Most people in compromised systems are not actively malicious; they are economically and socially rational. 

Because institutional machinery protects inertia and punishes disruption, speaking out carries immediate personal downside with zero guaranteed upside. Therefore, silence is the default equilibrium.`,
    topics: ['Power Dynamics', 'Human Behavior', 'Social Dynamics'],
    provenance: 'observed',
    confidence: 'high',
    sourceId: 'src_dragon_tattoo',
    sourceTitle: 'The Girl with the Dragon Tattoo',
    sourceMedium: 'movie',
    connectedObjectIds: ['src_dragon_tattoo', 'claim_watched_behavior'],
    createdAt: '2026-09-05T10:00:00Z',
    updatedAt: '2026-09-18T12:00:00Z',
    revisitCount: 2,
  },

  // 9. SOURCE: Thinking, Fast and Slow (Book)
  {
    id: 'src_kahneman',
    title: 'Thinking, Fast and Slow',
    type: 'source',
    summary: 'Daniel Kahneman’s synthesis of behavioral economics, heuristics, and System 1 / System 2 cognitive architecture.',
    content: `Essential foundation on how the mind conserves cognitive effort.

Core takeaways:
- System 2 is inherently lazy and seeks cognitive ease.
- Decision fatigue depletes self-control reserves.
- What You See Is All There Is (WYSIATI) drives premature closure in reasoning.`,
    topics: ['Human Behavior', 'Decision Friction', 'Cognitive Bias'],
    medium: 'book',
    creator: 'Daniel Kahneman',
    year: '2011',
    extractedItems: {
      noticed: [
        'Ego depletion is real: making choices drains the same pool of glucose/willpower needed for discipline.',
        'Cognitive ease feels like truth: familiar phrasing is accepted without scrutiny.',
      ],
      ideas: [
        'To make a behavior stick, frame it to require minimal System 2 intervention.',
      ],
      questions: [
        'How can creative writing be structured so that the generative phase relies on System 1 ease and editing on System 2 rigor?',
      ],
      quotes: [
        '"A reliable way to make people believe in falsehoods is frequent repetition, because familiarity is not easily distinguished from truth."',
      ],
    },
    connectedObjectIds: ['claim_decision_friction', 'idea_remove_decisions', 'top_human_behavior'],
    createdAt: '2026-08-15T15:00:00Z',
    updatedAt: '2026-09-12T09:40:00Z',
    revisitCount: 5,
  },

  // 10. OPEN QUESTION: What distinguishes enduring taste from temporary novelty?
  {
    id: 'q_enduring_taste',
    title: 'What distinguishes enduring taste from temporary novelty?',
    type: 'question',
    summary: 'A writer and creator question exploring why certain works, designs, and ideas outlive their cultural era.',
    content: `Examining why some books, films, and architectural works remain gripping 50 years later, while trendy works feel obsolete in 18 months.

Is it economy of means? Emotional restraint? Structural clarity?`,
    topics: ['Creative Flow', 'Aesthetics & Form', 'Human Behavior'],
    currentUnderstanding: 'Enduring work seems to focus on fundamental human invariances (jealousy, longing, mortality, craft discipline) through an economical, restrained form. Works that date rapidly usually over-index on contemporary idioms, novelty effects, and emotional exaggeration.',
    hypotheses: [
      {
        id: 'hyp_t1',
        statement: 'Restraint in ornament preserves longevity because it avoids tying the work to a specific decorative micro-era.',
        status: 'promising',
        confidence: 'moderate',
        evidenceNotes: 'Observed across mid-century architecture and Nordic cinematic lighting.',
      },
      {
        id: 'hyp_t2',
        statement: 'Art that resolves every question feels closed; enduring art leaves deliberate ambiguity for the viewer to inhabit.',
        status: 'untested',
        confidence: 'provisional',
      },
    ],
    connectedObjectIds: ['src_dragon_tattoo', 'note_writing_friction'],
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-22T15:00:00Z',
    revisitCount: 3,
  },

  // 11. NOTE: Friction budgeting in creative work
  {
    id: 'note_writing_friction',
    title: 'Friction budgeting in creative work',
    type: 'note',
    summary: 'Notes on preserving creative energy by moving formatting and admin tasks to separate sessions.',
    content: `You only have a fixed budget of initiation energy each morning. 

If you spend that budget on formatting fonts, organizing directory folders, or adjusting margins, you have spent the highest-order mental energy on zero-leverage administrative maintenance.

Rule: Draft in raw markdown with zero styling. Polish and typeset only after the substance exists.`,
    topics: ['Creative Flow', 'Decision Friction'],
    provenance: 'experienced',
    confidence: 'high',
    connectedObjectIds: ['claim_decision_friction', 'obs_tiny_decisions', 'idea_remove_decisions'],
    createdAt: '2026-09-15T09:30:00Z',
    updatedAt: '2026-09-29T10:00:00Z',
    revisitCount: 4,
  },

  // 12. SOURCE: The Sense of Style (Book)
  {
    id: 'src_pinker_style',
    title: 'The Sense of Style',
    type: 'source',
    summary: 'Steven Pinker’s guide to writing in the 21st century from a cognitive science lens.',
    content: `Pinker frames good writing through the "classic style": a conversation between equals directed toward an interesting reality.

The biggest obstacle to clear prose is the "Curse of Knowledge": assuming the reader knows what you know.`,
    topics: ['Creative Flow', 'Human Behavior'],
    medium: 'book',
    creator: 'Steven Pinker',
    year: '2014',
    extractedItems: {
      noticed: [
        'Writers often hide behind passive abstractions when they lack confidence in the concrete mechanics of what they are describing.',
      ],
      ideas: [
        'Writing is an act of directing visual attention in the reader’s mind.',
      ],
      questions: [
        'How can an author develop an internal radar for when they have succumbed to the Curse of Knowledge?',
      ],
      quotes: [
        '"The classic style models writing on conversation: the writer sees something that the reader has not yet noticed; he orientates the reader’s gaze so that she can see for herself."',
      ],
    },
    connectedObjectIds: ['note_writing_friction', 'q_enduring_taste'],
    createdAt: '2026-08-25T14:00:00Z',
    updatedAt: '2026-09-10T11:00:00Z',
    revisitCount: 3,
  },
];

export const INITIAL_PATTERNS: ConnectionPattern[] = [
  {
    id: 'pat_decision_friction',
    title: 'Decision Elimination Precedes High Consistency',
    observation: 'Your workout trial (20-min cap) and writing workflow notes both reveal that resistance occurs at initiation, driven by micro-decisions. Pre-determining steps drops friction by ~70%.',
    relatedItemIds: ['q_workout_1', 'exp_20min_workout', 'claim_decision_friction', 'obs_tiny_decisions', 'note_writing_friction'],
    confidence: 'high',
    suggestedAction: 'Synthesize into Core Working Principle',
    accepted: false,
    dismissed: false,
  },
  {
    id: 'pat_scrutiny_asymmetry',
    title: 'Scrutiny Asymmetry in Social Dynamics',
    observation: 'Reflections on "The Girl with the Dragon Tattoo" mirror observations on workplace hierarchies: institutional inertia shields predatory behavior because the friction of whistleblowing is borne entirely by the individual.',
    relatedItemIds: ['src_dragon_tattoo', 'claim_watched_behavior', 'obs_institutional_silence'],
    confidence: 'moderate',
    suggestedAction: 'Formulate Open Question on Institutional Reform',
    accepted: false,
    dismissed: false,
  },
];
