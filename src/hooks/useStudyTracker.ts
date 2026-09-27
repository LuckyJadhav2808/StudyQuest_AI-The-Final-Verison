'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  subscribeToCollection,
  setDocument,
  removeDocument,
} from '@/lib/firestore';
import toast from 'react-hot-toast';
import {
  SyllabusTrack,
  TrackerSubject,
  TrackerUnit,
  TrackerTopic,
  TopicStatus,
  TrackerKPIs,
  DailyLogEntry,
  DailyLogSlot,
  TestLogEntry,
  TestType,
  StudyTrackerSettings,
  DailyStudyHabit,
  StudyTimeSlotDef,
} from '@/types';
import { useGamification } from '@/hooks/useGamification';
import { useAuthContext } from '@/context/AuthContext';
import {
  getISOWeek,
  startOfISOWeek,
  endOfISOWeek,
  format,
  parseISO,
  differenceInDays,
  addDays,
} from 'date-fns';
import { getLocalDateString } from '@/lib/dateUtils';

const STORAGE_KEY = 'studyquest_syllabus_tracker_v1';
const ACTIVE_TRACK_KEY = 'studyquest_active_track_id';
const DAILY_LOGS_KEY = 'studyquest_daily_logs_v1';
const TEST_LOGS_KEY = 'studyquest_test_logs_v1';
const SETTINGS_KEY = 'studyquest_tracker_settings_v1';

export const DEFAULT_HABITS: DailyStudyHabit[] = [
  { id: 'habit-exercise', name: 'Exercise / Workout', icon: '💪', active: true },
  { id: 'habit-guitar', name: 'Guitar / Creative Skill', icon: '🎸', active: true },
  { id: 'habit-youtube', name: 'YT / Content Creation', icon: '🎥', active: true },
  { id: 'habit-calls', name: 'Family & Friend Calls', icon: '📞', active: true },
  { id: 'habit-sleep', name: 'Sleep by 10:00 PM', icon: '🌙', active: true },
];

export const DEFAULT_SLOTS: StudyTimeSlotDef[] = [
  { id: 'slot-1', label: 'Slot 1: 8:00 AM – 10:00 AM', defaultHours: 2.0 },
  { id: 'slot-2', label: 'Slot 2: 10:30 AM – 12:30 PM', defaultHours: 2.0 },
  { id: 'slot-3', label: 'Slot 3: 1:30 PM – 3:30 PM', defaultHours: 2.0 },
  { id: 'slot-4', label: 'Revision: 4:00 PM – 5:30 PM', defaultHours: 1.5 },
];

export const DEFAULT_SETTINGS: StudyTrackerSettings = {
  prepStartDate: '2026-07-01',
  prepEndDate: '2027-01-31',
  idealWeeklyHours: 52.5,
  totalSyllabusHours: 1158.78,
  habits: DEFAULT_HABITS,
  slots: DEFAULT_SLOTS,
};

// Default starter preset templates - FULL UNABRIDGED SYLLABI
export const PRESET_SYLLABUS_TEMPLATES: Omit<SyllabusTrack, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '📘 SPPU T.E. Comp Sem 5 (2024 Pattern)',
    description: 'Complete unabridged Savitribai Phule Pune University syllabus for AI, TOC, CN, and Cloud Computing.',
    isDefault: true,
    subjects: [
      {
        id: 'sppu-ai',
        name: 'Artificial Intelligence',
        code: 'PCC301COM',
        color: '#7C3AED',
        icon: '🤖',
        weightage: 25,
        units: [
          {
            id: 'sppu-ai-u1',
            unitNumber: 1,
            title: 'Unit I: Introduction to AI and Intelligent Agents',
            description: '09 Hours - Foundations, Ethics, Agent Types, Environments & Architectures',
            topics: [
              { id: 'sppu-ai-t1', title: 'Introduction to Artificial Intelligence & Foundations of Artificial Intelligence', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t2', title: 'History of Artificial Intelligence, Limits of AI, Ethics of AI, Future of AI', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t3', title: 'AI Components, AI Architectures & Intelligent Agents', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t4', title: 'Agents and Environments & Good Behavior: Concept of Rationality', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t5', title: 'Types of Agents, Nature of Environments, Structure of Agents', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t6', title: 'Case Study: Autonomous Taxi Agent – Waymo One', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-ai-t7', title: 'Case Study: AI in Healthcare – IBM Watson for Oncology', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-ai-u2',
            unitNumber: 2,
            title: 'Unit II: Problem Solving: State Space Approach and Search Strategies',
            description: '09 Hours - Heuristics, A*, Hill-Climbing, Simulated Annealing & Online Search',
            topics: [
              { id: 'sppu-ai-t8', title: 'State Space Search: Tower of Hanoi Representation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t9', title: 'Informed (Heuristic) Search Strategies: Introduction to Greedy BFS & A* Search', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-ai-t10', title: 'Iterative-deepening & Heuristic Functions', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t11', title: 'Local Search and Optimization Problems: Hill-climbing search', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t12', title: 'Simulated annealing & Local beam search', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t13', title: 'Online Search Agents and Unknown Environments: Online search problems', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t14', title: 'Case Study: Warehouse robots (Amazon Kiva) and self-driving cars', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-ai-t15', title: 'Logistics and Routing: Traveling Salesman Problem (TSP)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t16', title: 'Case Study: Google DeepMind – AI for Energy Efficiency in Data Centers', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-ai-u3',
            unitNumber: 3,
            title: 'Unit III: Adversarial Search and Game Theory',
            description: '09 Hours - Alpha-Beta Pruning, MCTS, CSPs & Constraint Propagation',
            topics: [
              { id: 'sppu-ai-t17', title: 'Optimal Decisions in Games & Heuristic Alpha–Beta Tree Search', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-ai-t18', title: 'Monte Carlo Tree Search (MCTS), Stochastic Games & Partially Observable Games', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t19', title: 'Limitations of Game Search Algorithms', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-ai-t20', title: 'Constraint Satisfaction Problems (CSP) & Constraint Propagation: Inference in CSPs', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-ai-t21', title: 'Backtracking Search for CSPs', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t22', title: 'Case Study: AlphaGo – AI in Strategic Board Games', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-ai-t23', title: 'Case Study: Strategic Decision-Making in Imperfect-Information Games – Libratus', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-ai-t24', title: 'Case Study: Adversarial Search and Constraint Reasoning in Computer Chess – IBM Deep Blue', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-ai-u4',
            unitNumber: 4,
            title: 'Unit IV: Knowledge Representation using Logical Formalisms, Propositional and First Order Predicate Calculus',
            description: '09 Hours - PL, FOL, Quantifiers, Inference Rules & Resolution',
            topics: [
              { id: 'sppu-ai-t25', title: 'Introduction to Logical Formalisms: Role of logic in Artificial Intelligence', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t26', title: 'Knowledge-based agents Syntax and semantics of logical systems', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t27', title: 'Propositional Logic – Basics and Inference: Propositional symbols and well-formed formulas', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t28', title: 'Logical connectives, Inference rules: Modus Ponens, Modus Tollens, Resolution', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-ai-t29', title: 'First Order Predicate Logic – Fundamentals: Motivation for First Order Logic', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t30', title: 'Quantifiers (∀, ∃), Well-formed formulas, Translating natural language into FOL', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-ai-t31', title: 'Inference in First Order Predicate Logic – Fundamentals', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t32', title: 'Case Study: Medical Expert System – MYCIN', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-ai-t33', title: 'Case Study: Knowledge-Based Reasoning in Intelligent Search Systems – AI-Based Rule Engine in Google Search', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-ai-u5',
            unitNumber: 5,
            title: 'Unit V: Planning and Industrial Applications of AI',
            description: '09 Hours - Goal Stack Planning, Blocks World & Multi-disciplinary AI',
            topics: [
              { id: 'sppu-ai-t34', title: 'Planning: Overview, An example Domain The Blocks world', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t35', title: 'The components of planning system', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t36', title: 'Goal stack planning', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-ai-t37', title: 'Nonlinear planning using constraint posting, Hierarchical planning', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t38', title: 'Industrial Applications of AI: AI in Healthcare, AI in Finance, AI in Retail', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t39', title: 'Industrial Applications of AI: AI in Agriculture, AI in Education, AI in Transportation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t40', title: 'AI in Experimentation and Multi-disciplinary research', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-ai-t41', title: 'Case Study: AI-Driven Supply Chain & Production Planning (Manufacturing)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
        ],
      },
      {
        id: 'sppu-cn',
        name: 'Computer Networks',
        code: 'PCC302COM',
        color: '#3B82F6',
        icon: '🌐',
        weightage: 25,
        units: [
          {
            id: 'sppu-cn-u1',
            unitNumber: 1,
            title: 'Unit I: Introduction to Computer Networks and Physical Layer',
            description: '09 Hours - Network Hardware/Software, OSI & TCP/IP Reference Models',
            topics: [
              { id: 'sppu-cn-t1', title: 'Introduction to computer networks; uses of computer networks – business applications, home applications, mobile users', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t2', title: 'Network hardware – PAN, LAN, MAN, WAN and internetworks', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t3', title: 'Network software – protocol hierarchies, design issues for layers', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t4', title: 'Connection-oriented and connection-less services, service primitives, relationship between services and protocols', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t5', title: 'Reference models – OSI and TCP/IP models', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t6', title: 'Physical Layer: guided transmission media; wireless transmission; telephone system', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t7', title: 'Narrowband and broadband communication systems', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t8', title: 'Case Study: Comparison of OSI vs TCP/IP in real-world networks', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cn-t9', title: 'Case Study: Broadband vs narrowband communication in India', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-cn-u2',
            unitNumber: 2,
            title: 'Unit II: Data Link Layer',
            description: '09 Hours - Error Detection (CRC, Checksum), Sliding Window ARQ & SONET',
            topics: [
              { id: 'sppu-cn-t10', title: 'Data Link Layer – services provided to the network layer, framing and addressing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t11', title: 'Design issues of the data link layer – error control, flow control and reliable data transfer', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t12', title: 'Error detection and correction techniques – parity, checksum, CRC and basic error correction concepts', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t13', title: 'Data link layer protocols – elementary protocols and Stop-and-Wait protocol', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t14', title: 'Sliding window protocols – pipelining, Go-Back-N and Selective Repeat protocols', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t15', title: 'Example data link layer technologies – packet over SONET', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t16', title: 'Case Study: CRC error detection in Ethernet', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cn-t17', title: 'Case Study: SONET backbone deployment in telecom networks', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-cn-u3',
            unitNumber: 3,
            title: 'Unit III: Network Layer',
            description: '09 Hours - Routing (Distance Vector, Link State), IPv4, Subnetting, CIDR & OSPF',
            topics: [
              { id: 'sppu-cn-t18', title: 'Network Layer – Services & Design Issues: connectionless service, connection-oriented service, QoS support', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t19', title: 'Error control, flow control, store-and-forward switching, congestion control, reliability, internetworking challenges', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t20', title: 'Routing Algorithms: shortest path routing, flooding, distance vector routing, link state routing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t21', title: 'Internet Architecture & Protocols: IP addressing (IPv4 classes, CIDR, subnetting)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'sppu-cn-t22', title: 'IPv4 vs IPv6, IP datagram, ICMP, ARP, RIP, OSPF', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t23', title: 'Case Study: IPv6 adoption in ISPs', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cn-t24', title: 'Case Study: Routing comparison between RIP and OSPF in enterprise networks', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-cn-u4',
            unitNumber: 4,
            title: 'Unit IV: Transport Layer Protocols',
            description: '09 Hours - Sockets, TCP/UDP, SCTP, RTP, Congestion Control & 5G Wireless',
            topics: [
              { id: 'sppu-cn-t25', title: 'Process to Process Delivery, Services, Socket Programming', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t26', title: 'Elements of Transport Layer Protocols: Addressing, Connection establishment, Connection release', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t27', title: 'Flow control and buffering, Multiplexing, Congestion Control', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t28', title: 'Transport Layer Protocols: TCP and UDP, SCTP, RTP', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t29', title: 'Congestion control and Quality of Service (QoS), Differentiated services', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t30', title: 'TCP and UDP for Wireless networks', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t31', title: 'Case Study: TCP congestion control in 4G/5G networks', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cn-t32', title: 'Case Study: RTP in video conferencing applications', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-cn-u5',
            unitNumber: 5,
            title: 'Unit V: Application Layer',
            description: '09 Hours - Client-Server, HTTP, DNS, SMTP, FTP, TELNET, DHCP, SNMP & CDNs',
            topics: [
              { id: 'sppu-cn-t33', title: 'Introduction – principles of application layer, client-server and peer-to-peer models', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t34', title: 'Web and HTTP – request/response, persistent vs. non-persistent connections, cookies, caching, performance', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t35', title: 'DNS – hierarchy, resource records, name resolution, caching, security issues', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cn-t36', title: 'Email – SMTP, MIME, POP3, IMAP, webmail, message format, security', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t37', title: 'FTP – basics, file transfer process, legacy relevance', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cn-t38', title: 'TELNET – remote login, limitations, legacy use', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cn-t39', title: 'DHCP – dynamic host configuration, IP allocation, management', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t40', title: 'SNMP – network management, monitoring, MIBs, security considerations', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t41', title: 'Emerging Topics – multimedia applications, RTP for streaming, peer-to-peer applications, cloud-based services', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cn-t42', title: 'Case Study: DNS security attacks (DNS spoofing)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cn-t43', title: 'Case Study: HTTP caching in CDNs, SMTP in enterprise email systems', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
        ],
      },
      {
        id: 'sppu-toc',
        name: 'Theory of Computation',
        code: 'PCC303COM',
        color: '#EC4899',
        icon: '⚙️',
        weightage: 25,
        units: [
          {
            id: 'sppu-toc-u1',
            unitNumber: 1,
            title: 'Unit I: Introduction to Formal Languages and Finite Automata',
            description: '09 Hours - DFA, NFA, ε-NFA, Minimization, Moore & Mealy Machines',
            topics: [
              { id: 'sppu-toc-t1', title: 'Basic Concepts: Finite and infinite set, Symbols, Strings (Empty String, Substring, Concatenation)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t2', title: 'Language: Formal Language Definition, Finite representation of languages', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t3', title: 'Operations on languages: Union, Concatenation, Kleene star and Kleene plus, Concept of Basic Machine', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t4', title: 'FA without output: Finite State Machines (FSM), Deterministic and Nondeterministic FA (DFA & NFA)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t5', title: 'Epsilon NFA, Conversion of NFA with epsilon moves to NFA', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t6', title: 'Conversion of NFA to DFA, and Conversion of NFA with epsilon moves to DFA', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t7', title: 'Minimization of DFAs', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t8', title: 'FA with output: Moore and Mealy machines - Definition, Construction, Inter-Conversion', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t9', title: 'Case Study: FSM for Vending Machine, Spell checker', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-toc-t10', title: 'Case Study: Finite Automata in ATM PIN Validation System', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-toc-u2',
            unitNumber: 2,
            title: 'Unit II: Regular Expressions and Languages',
            description: '09 Hours - RE Operators, Kleene Theorem, Arden Theorem, Pumping Lemma & Myhill-Nerode',
            topics: [
              { id: 'sppu-toc-t11', title: 'Introduction, Operators of RE, Precedence of operators, Algebraic laws for RE', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t12', title: 'Language to Regular Expressions, Equivalence of two REs, Kleene’s theorem', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t13', title: 'Conversions: RE to NFA, DFA', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t14', title: 'Conversions: DFA to RE using Arden’s theorem', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t15', title: 'Pumping Lemma for Regular languages', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t16', title: 'Closure (union, intersection, complementation, concatenation, Kleene closure) of Regular languages', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t17', title: 'Decision properties of Regular languages (Membership, Emptiness, Finiteness and Infiniteness)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t18', title: 'The Myhill–Nerode Theorem', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t19', title: 'Case Study: RE for variable name validation, RE to match a specific word from given string', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-toc-t20', title: 'Case Study: Regular Expressions in Email Validation System', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-toc-u3',
            unitNumber: 3,
            title: 'Unit III: Context Free Grammars (CFG) and Languages',
            description: '09 Hours - Parse Trees, Simplification, CNF, GNF, Pumping Lemma & Chomsky Hierarchy',
            topics: [
              { id: 'sppu-toc-t21', title: 'Formal Definition of Context Free Grammar, Sentential form, Derivation and Derivation Tree/ Parse Tree', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t22', title: 'Context Free Language (CFL), Ambiguous Grammar, writing grammar for language', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t23', title: 'Simplification of CFG: Eliminating ε-productions, unit productions, useless production, useless symbols', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t24', title: 'Normal Forms: Chomsky normal form (CNF)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t25', title: 'Normal Forms: Greibach normal form (GNF)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t26', title: 'Pumping Lemma for CFG, Closure properties of CFL', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t27', title: 'Chomsky Hierarchy', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t28', title: 'Applications of CFG: Palindromes, Parenthesis Match, Parser, Markup languages, XML and Document Type Definitions', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t29', title: 'Case Study: Grammar Design for Arithmetic Expressions', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-toc-t30', title: 'Case Study: Designing a Grammar for a Simple Programming Language Construct', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-toc-u4',
            unitNumber: 4,
            title: 'Unit IV: Push Down Automata (PDA)',
            description: '09 Hours - NPDA, Acceptance by Final State / Empty Stack, CFG Equivalence & Post Machine',
            topics: [
              { id: 'sppu-toc-t31', title: 'Introduction, Formal definition of PDA', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t32', title: 'Equivalence of Acceptance by Final State & Empty stack', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t33', title: 'Non-deterministic PDA (NPDA)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t34', title: 'PDA & Context Free Language, Equivalence of PDA and CFG, PDA vs CFLs', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t35', title: 'Applications of PDA, Introduction to Post Machine', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t36', title: 'Case Study: Applying PDA for Top-Down Parsing, Bottom-up Parsing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-toc-t37', title: 'Case Study: Pushdown Automata (PDA) in Compiler Syntax Checking', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-toc-t38', title: 'Case Study: XML / HTML Tag Validation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-toc-u5',
            unitNumber: 5,
            title: 'Unit V: Turing Machine and Computability Theory',
            description: '09 Hours - DTM, UTM, Halting Problem, Decidability, P vs NP & NP-Completeness',
            topics: [
              { id: 'sppu-toc-t39', title: 'Turing machine (TMs): Basic model, definition, and representation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t40', title: 'TM Instantaneous Description, Transition Function, Language accepted TM', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t41', title: 'Deterministic Turing Machines (DTM), and Construction of DTM', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-toc-t42', title: 'Universal Turing Machine (UTM), Church-Turing hypothesis, Comparison between FA, PDA and TM', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t43', title: 'Turing Machine Halting Problem', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t44', title: 'Decidable Problems and Undecidable Problems, Church-Turing Thesis', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t45', title: 'Reducibility: Undecidable Problems that are recursively enumerable, A Simple Undecidable', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t46', title: 'Complexity Classes: Time and Space Measures, The Class P, Examples of problems in P', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t47', title: 'The Class NP, Examples of problems in NP, P Problem Versus NP Problem', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t48', title: 'NP-completeness and hard Problems', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-toc-t49', title: 'Case Study: Application of Turing Machine for Language Recognition', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-toc-t50', title: 'Case Study: Comparative Study of Variants of Turing Machines', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-toc-t51', title: 'Case Study: Analysis of the Halting Problem', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
        ],
      },
      {
        id: 'sppu-cloud',
        name: 'Cloud Computing',
        code: 'PEC321BCOM',
        color: '#10B981',
        icon: '☁️',
        weightage: 25,
        units: [
          {
            id: 'sppu-cc-u1',
            unitNumber: 1,
            title: 'Unit I: Introduction to Cloud Computing',
            description: '09 Hours - Fundamentals, SaaS/PaaS/IaaS, Cloud Architecture & Storage',
            topics: [
              { id: 'sppu-cc-t1', title: 'Cloud Fundamentals: Definition, Importance of cloud computing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t2', title: 'Advantages and Disadvantages of Cloud Computing, Characteristics', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t3', title: 'Categories of Clouds: Private clouds, Public clouds', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t4', title: 'Cloud Service Models: SaaS, PaaS, IaaS', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t5', title: 'Cloud Architecture & Cloud Deployment Models', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t6', title: 'Cloud Storage: Distributed Data Storage, Data management', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t7', title: 'Case Study: Cloud Computing Model of Amazon', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-cc-u2',
            unitNumber: 2,
            title: 'Unit II: Virtualization in Cloud Computing',
            description: '09 Hours - Processor/Memory/Full/Para Virtualization, Hypervisors, VMware, Xen & Hyper-V',
            topics: [
              { id: 'sppu-cc-t8', title: 'Virtualization: What’s virtualization, Benefits of Virtualization', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t9', title: 'Types of Virtualization: Processor virtualization, Memory virtualization, Full virtualization, Para virtualization, and Device virtualization', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cc-t10', title: 'Virtual Clustering, Virtualization Architecture', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t11', title: 'Containerization and orchestration', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t12', title: 'Understanding importance of Hypervisors, Virtualization Applications, Issues with Virtualization', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t13', title: 'Virtualization and Cloud Computing: Virtualizations in Cloud, Virtual Infrastructure', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t14', title: 'CPU Virtualization, Network and Storage Virtualization', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t15', title: 'Case Study: VMware (Full virtualization), Xen (Para Virtualization), Microsoft HyperV', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-cc-u3',
            unitNumber: 3,
            title: 'Unit III: Cloud Platforms and Applications',
            description: '09 Hours - AWS (EC2, S3), Azure, OpenStack, GFS, BigTable & BigQuery',
            topics: [
              { id: 'sppu-cc-t16', title: 'Industrial Cloud Platforms: Amazon Web Services (AWS)- AWS infrastructure, Components', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t17', title: 'AWS Services: Amazon Simple DB, Elastic Cloud Computing (EC2), Amazon Storage System, Amazon Database Services', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cc-t18', title: 'Microsoft Azure: Azure core concepts, SQL Azure, and Application Services for managed runtimes', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t19', title: 'Open Source Platforms: Overview of OpenStack, CloudStack, and Eucalyptus for private cloud deployment', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t20', title: 'Cloud Applications: Data-Intensive & Emerging Applications - Smart Cities & IoT', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t21', title: 'AI/ML in the Cloud: Case study on Google Photos (image recognition) or Alexa (NLP) using cloud-based TPU/GPU', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t22', title: 'Healthcare & Biology (Gene sequencing, ECG analysis) & Geoscience (Satellite processing)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t23', title: 'Case Study: The Google Case Study Data Processing (Evolution from MapReduce to Dremel and BigQuery)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cc-t24', title: 'Case Study: Storage Innovation (Google File System - GFS and BigTable as global search backbone)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-cc-u4',
            unitNumber: 4,
            title: 'Unit IV: Security in Cloud Computing',
            description: '09 Hours - Risks, Data Security, CIA Triad, Secure Software & Acunetix',
            topics: [
              { id: 'sppu-cc-t25', title: 'Risks in Cloud Computing: Risk Management, Enterprise-Wide Risk Management', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t26', title: 'Types of Risks in Cloud Computing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t27', title: 'Data Security in Cloud: Security Issues, Challenges, advantages, Disadvantages', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t28', title: 'Cloud Digital persona and Data security, Content Level Security', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t29', title: 'Cloud Security Services: Confidentiality, Integrity and Availability (CIA Triad)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t30', title: 'Security Authorization Challenges in the Cloud', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t31', title: 'Secure Cloud Software Requirements, Secure Cloud Software Testing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t32', title: 'Case Study: Cloud Security Tool - Acunetix', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
          {
            id: 'sppu-cc-u5',
            unitNumber: 5,
            title: 'Unit V: Modern Cloud Environment & Emerging Technologies',
            description: '09 Hours - Mobile Cloud, Edge Computing, Docker, Kubernetes & Green Cloud',
            topics: [
              { id: 'sppu-cc-t33', title: 'Future Trends in cloud Computing, Mobile Cloud, Comet Cloud, Multimedia Cloud: IPTV', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t34', title: 'Energy Aware Cloud Computing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t35', title: 'Distributed Cloud Computing Vs. Edge Computing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t36', title: 'Containers, Dockers, Kubernets, Pod Management', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'sppu-cc-t37', title: 'Green Cloud & Sustainability: Sustainable Cloud Architecture, Energy-efficient data centre design', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'sppu-cc-t38', title: 'Carbon footprint tracking', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
              { id: 'sppu-cc-t39', title: 'Case Studies on DevOps: DocuSign, Forter, Gengo', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: '🏆 GATE CS & IT — Complete Standard Syllabus',
    description: 'Standard syllabus covering all 10 core subjects and 53 topics for GATE CSE.',
    isDefault: false,
    subjects: [
      {
        id: 'gate-em',
        name: 'Engineering Mathematics',
        code: 'GATE-EM',
        color: '#3B82F6',
        icon: '📐',
        weightage: 15,
        units: [
          {
            id: 'gate-em-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'Propositional & First-Order Logic, Combinatorics, Linear Algebra, Calculus & Probability',
            topics: [
              { id: 'gate-em-t1', title: 'Propositional and first order logic', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-em-t2', title: 'Sets, relations, functions, partial orders and lattices', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-em-t3', title: 'Monoids, Groups', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-em-t4', title: 'Graphs: connectivity, matching, colouring', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-em-t5', title: 'Combinatorics: counting, recurrence relations, generating functions', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-em-t6', title: 'Matrices, determinants, system of linear equations, eigenvalues and eigenvectors, LU decomposition', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-em-t7', title: 'Limits, continuity and differentiability', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-em-t8', title: 'Maxima and minima, Mean value theorem, Integration', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-em-t9', title: 'Random variables, Uniform, normal, exponential, Poisson and binomial distributions', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-em-t10', title: 'Mean, median, mode and standard deviation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-em-t11', title: 'Conditional probability and Bayes theorem', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
            ],
          },
        ],
      },
      {
        id: 'gate-dl',
        name: 'Digital Logic',
        code: 'GATE-DL',
        color: '#F59E0B',
        icon: '⚡',
        weightage: 6,
        units: [
          {
            id: 'gate-dl-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'Boolean Algebra, Minimization, Circuits & Number Representation',
            topics: [
              { id: 'gate-dl-t1', title: 'Boolean algebra and minimization – algebraic technique, Karnaugh map, tabular method', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-dl-t2', title: 'Design of combinational and sequential circuits', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-dl-t3', title: 'Number representation and arithmetic (fixed and floating point)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
            ],
          },
        ],
      },
      {
        id: 'gate-coa',
        name: 'Computer Organization and Architecture',
        code: 'GATE-COA',
        color: '#8B5CF6',
        icon: '🖥️',
        weightage: 10,
        units: [
          {
            id: 'gate-coa-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'Instruction Set, ALU, Control Unit, Memory Hierarchy, I/O & Pipelining',
            topics: [
              { id: 'gate-coa-t1', title: 'Instruction set and addressing modes', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-coa-t2', title: 'Design of arithmetic and logic unit (ALU)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-coa-t3', title: 'Design of control unit – hardwired and microprogrammed', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-coa-t4', title: 'Memory interfacing and hierarchy: performance, cache memory mapping', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-coa-t5', title: 'I/O interface (interrupt and DMA)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-coa-t6', title: 'Instruction pipelining, pipeline hazards', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
            ],
          },
        ],
      },
      {
        id: 'gate-pds',
        name: 'Programming and Data Structures',
        code: 'GATE-PDS',
        color: '#10B981',
        icon: '💻',
        weightage: 12,
        units: [
          {
            id: 'gate-pds-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'C Programming, Recursion & Fundamental Data Structures',
            topics: [
              { id: 'gate-pds-t1', title: 'Programming in C', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-pds-t2', title: 'Recursion', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-pds-t3', title: 'Arrays, stacks, queues, linked lists, trees, binary search trees, binary heaps, graphs', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 6 },
            ],
          },
        ],
      },
      {
        id: 'gate-algo',
        name: 'Algorithms',
        code: 'GATE-ALGO',
        color: '#EC4899',
        icon: '🧮',
        weightage: 11,
        units: [
          {
            id: 'gate-algo-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'Searching/Sorting, Asymptotics, Design Techniques & Graph Algorithms',
            topics: [
              { id: 'gate-algo-t1', title: 'Searching, sorting, hashing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-algo-t2', title: 'Asymptotic worst case time and space complexity', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-algo-t3', title: 'Algorithm design techniques: greedy, dynamic programming and divide-and-conquer', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 5 },
              { id: 'gate-algo-t4', title: 'Graph traversals, minimum spanning trees, shortest paths', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
            ],
          },
        ],
      },
      {
        id: 'gate-toc',
        name: 'Theory of Computation',
        code: 'GATE-TOC',
        color: '#06B6D4',
        icon: '⚙️',
        weightage: 9,
        units: [
          {
            id: 'gate-toc-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'Automata, Formal Grammars, Pumping Lemma & Turing Machines',
            topics: [
              { id: 'gate-toc-t1', title: 'Regular expressions and finite automata', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-toc-t2', title: 'Context-free grammars and push-down automata', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-toc-t3', title: 'Regular and context-free languages, pumping lemma', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-toc-t4', title: 'Turing machines and undecidability', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
            ],
          },
        ],
      },
      {
        id: 'gate-cd',
        name: 'Compiler Design',
        code: 'GATE-CD',
        color: '#F97316',
        icon: '🔧',
        weightage: 5,
        units: [
          {
            id: 'gate-cd-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'Lexical, Syntax, Intermediate Code, Optimization & Data Flow',
            topics: [
              { id: 'gate-cd-t1', title: 'Lexical analysis, parsing, syntax-directed translation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-cd-t2', title: 'Runtime environments', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-cd-t3', title: 'Intermediate code generation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-cd-t4', title: 'Local optimisation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-cd-t5', title: 'Data flow analyses: constant propagation, liveness analysis, common sub expression elimination', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
            ],
          },
        ],
      },
      {
        id: 'gate-os',
        name: 'Operating System',
        code: 'GATE-OS',
        color: '#6366F1',
        icon: '🛡️',
        weightage: 11,
        units: [
          {
            id: 'gate-os-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'Processes, Threads, Concurrency, Deadlock, Memory & Storage',
            topics: [
              { id: 'gate-os-t1', title: 'System calls, processes, threads, inter-process communication, concurrency and synchronization', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-os-t2', title: 'Deadlock', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-os-t3', title: 'CPU and I/O scheduling', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-os-t4', title: 'Memory management and virtual memory', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-os-t5', title: 'File systems', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
            ],
          },
        ],
      },
      {
        id: 'gate-db',
        name: 'Databases',
        code: 'GATE-DBMS',
        color: '#14B8A6',
        icon: '🗄️',
        weightage: 8,
        units: [
          {
            id: 'gate-db-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'ER Model, Relational Algebra, SQL, Normalization, Indexing & Transactions',
            topics: [
              { id: 'gate-db-t1', title: 'ER-model', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-db-t2', title: 'Relational model: relational algebra, tuple calculus, SQL', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-db-t3', title: 'Integrity constraints, normal forms', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-db-t4', title: 'File organization, indexing (e.g., B and B+ trees)', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-db-t5', title: 'Transactions and concurrency control', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
            ],
          },
        ],
      },
      {
        id: 'gate-cn',
        name: 'Computer Networks',
        code: 'GATE-CN',
        color: '#4F46E5',
        icon: '🌐',
        weightage: 13,
        units: [
          {
            id: 'gate-cn-u1',
            unitNumber: 1,
            title: 'Unit 1: Complete GATE Syllabus',
            description: 'Layering, Switching, MAC, Routing, IPv4/NAT, TCP & Application Protocols',
            topics: [
              { id: 'gate-cn-t1', title: 'Principles of Layering', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
              { id: 'gate-cn-t2', title: 'Basics of switching (circuit, packet and virtual circuit) and performance metrics', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-cn-t3', title: 'Data link layer: error detection, Medium Access Control, Ethernet', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-cn-t4', title: 'Distance vector and link state routing', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 3 },
              { id: 'gate-cn-t5', title: 'IPv4 - Fragmentation, CIDR Notation, Network Address Translation', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-cn-t6', title: 'TCP - flow control and congestion control, socket API', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 4 },
              { id: 'gate-cn-t7', title: 'DNS and HTTP', status: 'todo', confidence: 0, revisionCount: 0, estimatedHours: 2 },
            ],
          },
        ],
      },
    ],
  },
];

export function useStudyTracker() {
  const { user } = useAuthContext();
  const { awardXP } = useGamification();
  const [tracks, setTracks] = useState<SyllabusTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string>('');
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);
  const [testLogs, setTestLogs] = useState<TestLogEntry[]>([]);
  const [trackerSettings, setTrackerSettings] = useState<StudyTrackerSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize tracks with Firebase Firestore or fallback to localStorage
  useEffect(() => {
    if (user) {
      const ref = collection(db, 'users', user.uid, 'syllabusTracks');
      const unsub = subscribeToCollection<SyllabusTrack>(
        ref,
        (cloudItems) => {
          if (cloudItems && cloudItems.length > 0) {
            cloudItems.sort((a, b) => b.createdAt - a.createdAt);
            setTracks(cloudItems);
            setActiveTrackId((prev) => (prev && cloudItems.some((t) => t.id === prev) ? prev : cloudItems[0].id));
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudItems));
            } catch { /* ignore */ }
          } else {
            const defaultTrackId = uuidv4();
            const initialTracks: SyllabusTrack[] = PRESET_SYLLABUS_TEMPLATES.map((tmpl, idx) => ({
              id: idx === 0 ? defaultTrackId : uuidv4(),
              ...tmpl,
              createdAt: Date.now() - idx * 1000,
              updatedAt: Date.now() - idx * 1000,
            }));

            setTracks(initialTracks);
            setActiveTrackId(defaultTrackId);
            initialTracks.forEach((t) => {
              const docRef = doc(db, 'users', user.uid, 'syllabusTracks', t.id);
              setDocument(docRef, t, false);
            });
          }
          setLoading(false);
        },
        orderBy('createdAt', 'desc')
      );

      return unsub;
    } else {
      try {
        const rawTracks = localStorage.getItem(STORAGE_KEY);
        const savedActiveId = localStorage.getItem(ACTIVE_TRACK_KEY);

        if (rawTracks) {
          const parsed: SyllabusTrack[] = JSON.parse(rawTracks);
          if (parsed.length > 0) {
            setTracks(parsed);
            setActiveTrackId(savedActiveId && parsed.some((t) => t.id === savedActiveId) ? savedActiveId : parsed[0].id);
            setLoading(false);
            return;
          }
        }

        const defaultTrackId = uuidv4();
        const initialTracks: SyllabusTrack[] = PRESET_SYLLABUS_TEMPLATES.map((tmpl, idx) => ({
          id: idx === 0 ? defaultTrackId : uuidv4(),
          ...tmpl,
          createdAt: Date.now() - idx * 1000,
          updatedAt: Date.now() - idx * 1000,
        }));

        setTracks(initialTracks);
        setActiveTrackId(defaultTrackId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialTracks));
        localStorage.setItem(ACTIVE_TRACK_KEY, defaultTrackId);
      } catch (e) {
        console.error('Error initializing StudyTracker tracks:', e);
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  // Synchronize Daily Logs (Pure user logs only, zero demo/mock data)
  useEffect(() => {
    if (user) {
      const ref = collection(db, 'users', user.uid, 'dailyLogs');
      const unsub = subscribeToCollection<DailyLogEntry>(
        ref,
        (cloudItems) => {
          const validItems = (cloudItems || []).filter((l) => !l.id.startsWith('sample-'));
          if (validItems.length > 0) {
            validItems.sort((a, b) => b.date.localeCompare(a.date));
            setDailyLogs(validItems);
            try {
              localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(validItems));
            } catch { /* ignore */ }
          } else {
            try {
              const local = localStorage.getItem(DAILY_LOGS_KEY);
              if (local) {
                const parsed: DailyLogEntry[] = JSON.parse(local);
                const filtered = parsed.filter((l) => !l.id.startsWith('sample-'));
                setDailyLogs(filtered);
                localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(filtered));
              }
            } catch { /* ignore */ }
          }
        },
        orderBy('date', 'desc')
      );
      return unsub;
    } else {
      try {
        const raw = localStorage.getItem(DAILY_LOGS_KEY);
        if (raw) {
          const parsed: DailyLogEntry[] = JSON.parse(raw);
          const filtered = parsed.filter((l) => !l.id.startsWith('sample-'));
          setDailyLogs(filtered);
          localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Error loading daily logs from localStorage:', e);
      }
    }
  }, [user]);

  // Synchronize Test Logs (Pure user tests only, zero demo/mock data)
  useEffect(() => {
    if (user) {
      const ref = collection(db, 'users', user.uid, 'testLogs');
      const unsub = subscribeToCollection<TestLogEntry>(
        ref,
        (cloudItems) => {
          const validItems = (cloudItems || []).filter((t) => !t.id.startsWith('sample-'));
          if (validItems.length > 0) {
            validItems.sort((a, b) => b.date.localeCompare(a.date));
            setTestLogs(validItems);
            try {
              localStorage.setItem(TEST_LOGS_KEY, JSON.stringify(validItems));
            } catch { /* ignore */ }
          } else {
            try {
              const local = localStorage.getItem(TEST_LOGS_KEY);
              if (local) {
                const parsed: TestLogEntry[] = JSON.parse(local);
                const filtered = parsed.filter((t) => !t.id.startsWith('sample-'));
                setTestLogs(filtered);
                localStorage.setItem(TEST_LOGS_KEY, JSON.stringify(filtered));
              }
            } catch { /* ignore */ }
          }
        },
        orderBy('date', 'desc')
      );
      return unsub;
    } else {
      try {
        const raw = localStorage.getItem(TEST_LOGS_KEY);
        if (raw) {
          const parsed: TestLogEntry[] = JSON.parse(raw);
          const filtered = parsed.filter((t) => !t.id.startsWith('sample-'));
          setTestLogs(filtered);
          localStorage.setItem(TEST_LOGS_KEY, JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Error loading test logs from localStorage:', e);
      }
    }
  }, [user]);

  // Synchronize Settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setTrackerSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error('Error loading tracker settings:', e);
    }
  }, []);

  // Save Tracks
  const saveTracks = useCallback((updatedTracks: SyllabusTrack[], newActiveId?: string) => {
    setTracks(updatedTracks);
    if (newActiveId) {
      setActiveTrackId(newActiveId);
      try {
        localStorage.setItem(ACTIVE_TRACK_KEY, newActiveId);
      } catch { /* ignore */ }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTracks));
    } catch (e) {
      console.error('Failed to save study tracks to localStorage:', e);
    }

    if (user) {
      updatedTracks.forEach((track) => {
        const docRef = doc(db, 'users', user.uid, 'syllabusTracks', track.id);
        setDocument(docRef, track, true);
      });
    }
  }, [user]);

  // Save Settings
  const updateTrackerSettings = useCallback((updates: Partial<StudyTrackerSettings>) => {
    setTrackerSettings((prev) => {
      const merged = { ...prev, ...updates };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch { /* ignore */ }
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'studySettings', 'main');
        setDocument(docRef, merged, true);
      }
      return merged;
    });
    toast.success('Settings updated');
  }, [user]);

  // Save Daily Logs
  const saveDailyLog = useCallback((entry: DailyLogEntry) => {
    setDailyLogs((prev) => {
      const exists = prev.some((l) => l.id === entry.id || l.date === entry.date);
      const updated = exists
        ? prev.map((l) => (l.id === entry.id || l.date === entry.date ? entry : l))
        : [entry, ...prev];
      updated.sort((a, b) => b.date.localeCompare(a.date));

      try {
        localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }

      if (user) {
        const docRef = doc(db, 'users', user.uid, 'dailyLogs', entry.id);
        setDocument(docRef, entry, true);
      }
      return updated;
    });

    awardXP(25, `Logged daily study session (${entry.totalHours}h)`);
    toast.success(`Saved study log for ${entry.date}! +25 XP`);
  }, [user, awardXP]);

  const deleteDailyLog = useCallback((logId: string) => {
    setDailyLogs((prev) => {
      const updated = prev.filter((l) => l.id !== logId);
      try {
        localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'dailyLogs', logId);
        removeDocument(docRef);
      }
      return updated;
    });
    toast.success('Daily study log deleted');
  }, [user]);

  // Save Test Logs
  const saveTestLog = useCallback((test: TestLogEntry) => {
    setTestLogs((prev) => {
      const exists = prev.some((t) => t.id === test.id);
      const updated = exists
        ? prev.map((t) => (t.id === test.id ? test : t))
        : [test, ...prev];
      updated.sort((a, b) => b.date.localeCompare(a.date));

      try {
        localStorage.setItem(TEST_LOGS_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }

      if (user) {
        const docRef = doc(db, 'users', user.uid, 'testLogs', test.id);
        setDocument(docRef, test, true);
      }
      return updated;
    });

    awardXP(30, `Recorded test score (${test.percentage.toFixed(0)}%)`);
    toast.success(`Recorded test "${test.testName}"! +30 XP`);
  }, [user, awardXP]);

  const deleteTestLog = useCallback((testId: string) => {
    setTestLogs((prev) => {
      const updated = prev.filter((t) => t.id !== testId);
      try {
        localStorage.setItem(TEST_LOGS_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'testLogs', testId);
        removeDocument(docRef);
      }
      return updated;
    });
    toast.success('Test log removed');
  }, [user]);

  // Habit CRUD with Toast Undo
  const addHabit = useCallback((name: string, icon: string = '✨') => {
    const newHabit: DailyStudyHabit = {
      id: `habit-${uuidv4().slice(0, 8)}`,
      name,
      icon,
      active: true,
    };
    updateTrackerSettings({
      habits: [...trackerSettings.habits, newHabit],
    });
    toast.success(`Added habit: ${name}`);
  }, [trackerSettings.habits, updateTrackerSettings]);

  const updateHabit = useCallback((habitId: string, updates: Partial<DailyStudyHabit>) => {
    const updated = trackerSettings.habits.map((h) =>
      h.id === habitId ? { ...h, ...updates } : h
    );
    updateTrackerSettings({ habits: updated });
  }, [trackerSettings.habits, updateTrackerSettings]);

  const restoreHabit = useCallback((habitToRestore: DailyStudyHabit) => {
    updateTrackerSettings({
      habits: [...trackerSettings.habits, habitToRestore],
    });
    toast.success(`Restored habit: ${habitToRestore.name}`);
  }, [trackerSettings.habits, updateTrackerSettings]);

  const deleteHabit = useCallback((habitId: string) => {
    const habitToDelete = trackerSettings.habits.find((h) => h.id === habitId);
    if (!habitToDelete) return;

    const remainingHabits = trackerSettings.habits.filter((h) => h.id !== habitId);
    updateTrackerSettings({ habits: remainingHabits });
    toast.success(`Removed habit "${habitToDelete.name}"`);
  }, [trackerSettings.habits, updateTrackerSettings]);

  // Active track
  const activeTrack = useMemo(() => {
    return tracks.find((t) => t.id === activeTrackId) || tracks[0] || null;
  }, [tracks, activeTrackId]);

  // Compute Complete Dynamic KPIs
  const kpis: TrackerKPIs = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Prep window metrics
    let prepStart = parseISO(trackerSettings.prepStartDate);
    let prepEnd = parseISO(trackerSettings.prepEndDate);
    if (isNaN(prepStart.getTime())) prepStart = new Date('2026-07-01');
    if (isNaN(prepEnd.getTime())) prepEnd = new Date('2027-01-31');

    const rawDaysElapsed = differenceInDays(now, prepStart);
    const daysElapsed = Math.max(0, rawDaysElapsed);
    const rawDaysRemaining = differenceInDays(prepEnd, now);
    const daysRemaining = Math.max(0, rawDaysRemaining);

    // Topic stats
    let totalTopics = 0;
    let completedTopics = 0;
    let inProgressTopics = 0;
    let todoTopics = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    let weakTopicsCount = 0;
    let estimatedHoursLeft = 0;
    let completedThisWeekCount = 0;
    let topicsDoneOrRevised = 0;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const allTrackTopics: Array<{ topic: TrackerTopic; subjectName: string; color: string; icon: string }> = [];

    if (activeTrack) {
      activeTrack.subjects.forEach((subject) => {
        subject.units.forEach((unit) => {
          unit.topics.forEach((topic) => {
            totalTopics++;
            allTrackTopics.push({
              topic,
              subjectName: subject.name,
              color: subject.color,
              icon: subject.icon,
            });

            if (topic.confidence && topic.confidence > 0) {
              totalConfidence += topic.confidence;
              confidenceCount++;
              if (topic.confidence <= 2) weakTopicsCount++;
            }

            const isDone = topic.status === 'mastered' || topic.status === 'done' || topic.status === 'revised';
            if (isDone) {
              completedTopics++;
              topicsDoneOrRevised++;
              if (topic.completedAt && topic.completedAt >= oneWeekAgo) {
                completedThisWeekCount++;
              }
            } else if (topic.status === 'in-progress') {
              inProgressTopics++;
              estimatedHoursLeft += topic.estimatedHours || 2;
            } else {
              todoTopics++;
              estimatedHoursLeft += topic.estimatedHours || 2;
            }
          });
        });
      });
    }

    const overallCompletionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const averageConfidence = confidenceCount > 0 ? Number((totalConfidence / confidenceCount).toFixed(1)) : 0;
    const weightedReadinessScore = totalTopics > 0
      ? Math.round(
          ((completedTopics * 1.0 + inProgressTopics * 0.45) / totalTopics) * 100
        )
      : 0;

    // Daily Logs stats
    const trackLogs = dailyLogs.filter((l) => !l.trackId || !activeTrack || l.trackId === activeTrack.id);
    const totalStudyHours = Number(trackLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0).toFixed(1));
    const uniqueDays = new Set(trackLogs.map((l) => l.date)).size;
    const avgHoursPerDay = uniqueDays > 0 ? Number((totalStudyHours / uniqueDays).toFixed(1)) : 0;
    let bestDayHours = 0;
    let daysWith5PlusHours = 0;

    // Time-slot counts
    let slot1DoneCount = 0;
    let slot2DoneCount = 0;
    let slot3DoneCount = 0;
    let slot4DoneCount = 0;
    let dppDoneCount = 0;
    let totalFocus = 0;
    let focusDaysCount = 0;

    // Habits breakdown
    const habitCompletedDays: Record<string, number> = {};
    trackerSettings.habits.forEach((h) => {
      habitCompletedDays[h.id] = 0;
    });

    trackLogs.forEach((log) => {
      if (log.totalHours > bestDayHours) bestDayHours = log.totalHours;
      if (log.totalHours >= 5.0) daysWith5PlusHours++;

      if (log.slots?.['slot-1']?.completed) slot1DoneCount++;
      if (log.slots?.['slot-2']?.completed) slot2DoneCount++;
      if (log.slots?.['slot-3']?.completed) slot3DoneCount++;
      if (log.slots?.['slot-4']?.completed) slot4DoneCount++;

      if (log.dpp?.completed) dppDoneCount++;

      if (log.focusRating && log.focusRating > 0) {
        totalFocus += log.focusRating;
        focusDaysCount++;
      }

      if (log.habitStatus) {
        Object.entries(log.habitStatus).forEach(([hId, val]) => {
          if (val) {
            habitCompletedDays[hId] = (habitCompletedDays[hId] || 0) + 1;
          }
        });
      }
    });

    const logsCount = Math.max(1, trackLogs.length);
    const slotStats = {
      slot1Pct: Math.round((slot1DoneCount / logsCount) * 100),
      slot2Pct: Math.round((slot2DoneCount / logsCount) * 100),
      slot3Pct: Math.round((slot3DoneCount / logsCount) * 100),
      slot4Pct: Math.round((slot4DoneCount / logsCount) * 100),
      dppDonePct: Math.round((dppDoneCount / logsCount) * 100),
      avgFocusScore: focusDaysCount > 0 ? Number((totalFocus / focusDaysCount).toFixed(1)) : 0,
    };

    const habitStats: TrackerKPIs['habitStats'] = {};
    trackerSettings.habits.forEach((h) => {
      const daysDone = habitCompletedDays[h.id] || 0;
      habitStats[h.id] = {
        name: h.name,
        icon: h.icon,
        daysCompleted: daysDone,
        completionPct: Math.round((daysDone / logsCount) * 100),
      };
    });

    // ISO Weekly Hours aggregation
    const weekMap: Record<number, { actual: number; startDate: string; endDate: string }> = {};
    trackLogs.forEach((log) => {
      try {
        const d = parseISO(log.date);
        const w = getISOWeek(d);
        if (!weekMap[w]) {
          const s = format(startOfISOWeek(d), 'yyyy-MM-dd');
          const e = format(endOfISOWeek(d), 'yyyy-MM-dd');
          weekMap[w] = { actual: 0, startDate: s, endDate: e };
        }
        weekMap[w].actual += log.totalHours || 0;
      } catch { /* ignore */ }
    });

    const idealWeekly = trackerSettings.idealWeeklyHours || 52.5;
    const weeklyHours = Object.entries(weekMap)
      .map(([wNum, data]) => {
        const actualHours = Number(data.actual.toFixed(1));
        const gapPct = Math.round(((actualHours - idealWeekly) / idealWeekly) * 100);
        return {
          weekNumber: Number(wNum),
          startDate: data.startDate,
          endDate: data.endDate,
          actualHours,
          idealHours: idealWeekly,
          gapPct,
          dailyAvg: Number((actualHours / 7).toFixed(1)),
        };
      })
      .sort((a, b) => b.weekNumber - a.weekNumber);

    // Monthly hours
    const monthMap: Record<string, { totalHours: number; days: Set<string> }> = {};
    trackLogs.forEach((log) => {
      const m = log.month || log.date.slice(0, 7);
      if (!monthMap[m]) monthMap[m] = { totalHours: 0, days: new Set() };
      monthMap[m].totalHours += log.totalHours || 0;
      monthMap[m].days.add(log.date);
    });

    const monthlyHours = Object.entries(monthMap)
      .map(([month, data]) => ({
        month,
        totalHours: Number(data.totalHours.toFixed(1)),
        daysCount: data.days.size,
        dailyAvg: data.days.size > 0 ? Number((data.totalHours / data.days.size).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    // Subject hours breakdown
    const subjectHoursBreakdown = (activeTrack?.subjects || []).map((sub) => {
      // Find logs touching this subject
      let actualHours = 0;
      trackLogs.forEach((log) => {
        if (log.primarySubjectId === sub.id) {
          actualHours += log.totalHours || 0;
        } else if (log.subjectIds?.includes(sub.id)) {
          actualHours += (log.totalHours || 0) / Math.max(1, log.subjectIds.length);
        }
      });

      // Ideal hours based on weightage
      const weight = sub.weightage ?? 10;
      const ideal = Number(((weight / 100) * (trackerSettings.totalSyllabusHours || 1158.78)).toFixed(1));

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        color: sub.color,
        icon: sub.icon,
        actualHours: Number(actualHours.toFixed(1)),
        idealHours: ideal > 0 ? ideal : 60,
      };
    });

    // Test stats
    const trackTests = testLogs.filter((t) => !t.trackId || !activeTrack || t.trackId === activeTrack.id);
    const totalTests = trackTests.length;
    const overallAvgPct = totalTests > 0
      ? Math.round(trackTests.reduce((sum, t) => sum + (t.percentage || 0), 0) / totalTests)
      : 0;

    const avgByType: Record<string, number> = {};
    const countByType: Record<string, { sum: number; count: number }> = {};
    trackTests.forEach((t) => {
      if (!countByType[t.testType]) countByType[t.testType] = { sum: 0, count: 0 };
      countByType[t.testType].sum += t.percentage;
      countByType[t.testType].count++;
    });
    Object.entries(countByType).forEach(([type, data]) => {
      avgByType[type] = Math.round(data.sum / data.count);
    });

    // Syllabus burn-down & projected finish date
    const totalSyllabusHours = trackerSettings.totalSyllabusHours || 1158.78;
    // Completed hours calculation from actual study + completed topics
    const completedHours = Number(Math.min(totalSyllabusHours, totalStudyHours).toFixed(1));
    const remainingHours = Number(Math.max(0, totalSyllabusHours - completedHours).toFixed(1));
    const remainingPct = Math.round((remainingHours / totalSyllabusHours) * 100);

    // Rolling 7-day average
    const recent7Days = trackLogs.slice(0, 7);
    const rolling7DayTotal = recent7Days.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    const rolling7DayDailyAvg = recent7Days.length > 0 ? Number((rolling7DayTotal / recent7Days.length).toFixed(1)) : 0;

    let projectedCompletionDate = 'Calculating...';
    if (rolling7DayDailyAvg > 0) {
      const daysNeeded = Math.ceil(remainingHours / rolling7DayDailyAvg);
      const projDate = addDays(now, daysNeeded);
      projectedCompletionDate = format(projDate, 'MMM d, yyyy');
    } else if (remainingHours <= 0) {
      projectedCompletionDate = 'Syllabus Completed! 🎉';
    } else {
      projectedCompletionDate = 'Log hours to project';
    }

    // Spaced repetition priority revision queue
    const priorityRevisionQueue: TrackerKPIs['priorityRevisionQueue'] = [];
    allTrackTopics.forEach(({ topic, subjectName, color, icon }) => {
      if (topic.confidence && topic.confidence <= 2) {
        priorityRevisionQueue.push({
          topicId: topic.id,
          topicTitle: topic.title,
          subjectName,
          subjectColor: color,
          subjectIcon: icon,
          reason: `Low Confidence (${topic.confidence}/5)`,
          confidence: topic.confidence,
        });
      } else if (topic.status === 'in-progress') {
        priorityRevisionQueue.push({
          topicId: topic.id,
          topicTitle: topic.title,
          subjectName,
          subjectColor: color,
          subjectIcon: icon,
          reason: 'In Progress (Active Focus)',
          confidence: topic.confidence || 3,
        });
      }
    });

    // Also inject topics flagged as weak in recent test logs
    trackTests.slice(0, 5).forEach((t) => {
      if (t.weakTopicIds && t.weakTopicIds.length > 0) {
        t.weakTopicIds.forEach((wId) => {
          const match = allTrackTopics.find((att) => att.topic.id === wId);
          if (match && !priorityRevisionQueue.some((q) => q.topicId === wId)) {
            priorityRevisionQueue.push({
              topicId: match.topic.id,
              topicTitle: match.topic.title,
              subjectName: match.subjectName,
              subjectColor: match.color,
              subjectIcon: match.icon,
              reason: `Weak in ${t.testType} test (${t.percentage.toFixed(0)}%)`,
              confidence: match.topic.confidence || 2,
            });
          }
        });
      }
    });

    return {
      totalTopics,
      completedTopics,
      inProgressTopics,
      todoTopics,
      overallCompletionPct,
      weightedReadinessScore,
      averageConfidence,
      totalSubjects: activeTrack?.subjects?.length || 0,
      weakTopicsCount,
      estimatedHoursLeft,
      completedThisWeekCount,
      keyStats: {
        daysElapsed,
        daysRemaining,
        totalStudyHours,
        avgHoursPerDay,
        bestDayHours,
        daysWith5PlusHours,
        topicsDoneOrRevised,
      },
      slotStats,
      habitStats,
      weeklyHours,
      monthlyHours,
      subjectHoursBreakdown,
      testStats: {
        overallAvgPct,
        totalTests,
        avgByType,
      },
      burnDown: {
        totalSyllabusHours,
        completedHours,
        remainingHours,
        remainingPct,
        rolling7DayDailyAvg,
        projectedCompletionDate,
      },
      priorityRevisionQueue: priorityRevisionQueue.slice(0, 8),
    };
  }, [activeTrack, dailyLogs, testLogs, trackerSettings]);

  // Track CRUD Actions
  const createTrack = useCallback((title: string, description?: string) => {
    const newTrack: SyllabusTrack = {
      id: uuidv4(),
      title,
      description,
      isDefault: false,
      subjects: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newTrack, ...tracks];
    saveTracks(updated, newTrack.id);
    toast.success(`Created syllabus track "${title}"!`);
  }, [tracks, saveTracks]);

  const deleteTrack = useCallback((trackId: string) => {
    if (tracks.length <= 1) {
      toast.error('Cannot delete the last syllabus track');
      return;
    }
    const updated = tracks.filter((t) => t.id !== trackId);
    const nextActive = updated[0]?.id || '';

    if (user) {
      const docRef = doc(db, 'users', user.uid, 'syllabusTracks', trackId);
      removeDocument(docRef);
    }

    saveTracks(updated, nextActive);
    toast.success('Syllabus track deleted');
  }, [tracks, saveTracks, user]);

  const loadPresetTemplate = useCallback((presetIndex: number) => {
    const tmpl = PRESET_SYLLABUS_TEMPLATES[presetIndex];
    if (!tmpl) return;

    const newTrack: SyllabusTrack = {
      id: uuidv4(),
      title: tmpl.title,
      description: tmpl.description,
      isDefault: false,
      subjects: JSON.parse(JSON.stringify(tmpl.subjects)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newTrack, ...tracks];
    saveTracks(updated, newTrack.id);
    toast.success(`Loaded preset "${tmpl.title}"!`);
  }, [tracks, saveTracks]);

  // Subject CRUD Actions
  const addSubject = useCallback((name: string, icon: string = '📚', color: string = '#7C3AED', code?: string, weightage?: number) => {
    if (!activeTrack) return;

    const newSubject: TrackerSubject = {
      id: uuidv4(),
      name,
      icon,
      color,
      code,
      weightage: weightage || 10,
      units: [
        {
          id: uuidv4(),
          unitNumber: 1,
          title: 'Unit 1: Foundations',
          topics: [],
        },
      ],
    };

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: [...track.subjects, newSubject],
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    saveTracks(updatedTracks);
    toast.success(`Added subject "${name}"!`);
  }, [activeTrack, tracks, saveTracks]);

  const updateSubject = useCallback((subjectId: string, updates: Partial<TrackerSubject>) => {
    if (!activeTrack) return;

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: track.subjects.map((s) => (s.id === subjectId ? { ...s, ...updates } : s)),
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    saveTracks(updatedTracks);
  }, [activeTrack, tracks, saveTracks]);

  const deleteSubject = useCallback((subjectId: string) => {
    if (!activeTrack) return;

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: track.subjects.filter((s) => s.id !== subjectId),
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    saveTracks(updatedTracks);
    toast.success('Subject deleted');
  }, [activeTrack, tracks, saveTracks]);

  // Unit CRUD Actions
  const addUnit = useCallback((subjectId: string, title: string, description?: string) => {
    if (!activeTrack) return;

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: track.subjects.map((sub) => {
            if (sub.id === subjectId) {
              const newUnit: TrackerUnit = {
                id: uuidv4(),
                unitNumber: sub.units.length + 1,
                title,
                description,
                topics: [],
              };
              return { ...sub, units: [...sub.units, newUnit] };
            }
            return sub;
          }),
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    saveTracks(updatedTracks);
    toast.success(`Added ${title}!`);
  }, [activeTrack, tracks, saveTracks]);

  const deleteUnit = useCallback((subjectId: string, unitId: string) => {
    if (!activeTrack) return;

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: track.subjects.map((sub) => {
            if (sub.id === subjectId) {
              return { ...sub, units: sub.units.filter((u) => u.id !== unitId) };
            }
            return sub;
          }),
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    saveTracks(updatedTracks);
    toast.success('Unit removed');
  }, [activeTrack, tracks, saveTracks]);

  // Topic CRUD Actions
  const addTopic = useCallback((subjectId: string, unitId: string, title: string, confidence: number = 0, estimatedHours: number = 2) => {
    if (!activeTrack) return;

    const newTopic: TrackerTopic = {
      id: uuidv4(),
      title,
      status: 'todo',
      confidence,
      revisionCount: 0,
      estimatedHours,
      pyqDone: false,
    };

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: track.subjects.map((sub) => {
            if (sub.id === subjectId) {
              return {
                ...sub,
                units: sub.units.map((u) => {
                  if (u.id === unitId) {
                    return { ...u, topics: [...u.topics, newTopic] };
                  }
                  return u;
                }),
              };
            }
            return sub;
          }),
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    saveTracks(updatedTracks);
    toast.success(`Added topic "${title}"!`);
  }, [activeTrack, tracks, saveTracks]);

  const bulkAddTopics = useCallback((subjectId: string, unitId: string, rawText: string) => {
    if (!activeTrack || !rawText.trim()) return;

    const lines = rawText
      .split('\n')
      .map((line) => line.replace(/^[•\-\*\d\.\s]+/, '').trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    const newTopics: TrackerTopic[] = lines.map((title) => ({
      id: uuidv4(),
      title,
      status: 'todo',
      confidence: 0,
      revisionCount: 0,
      estimatedHours: 2,
      pyqDone: false,
    }));

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: track.subjects.map((sub) => {
            if (sub.id === subjectId) {
              return {
                ...sub,
                units: sub.units.map((u) => {
                  if (u.id === unitId) {
                    return { ...u, topics: [...u.topics, ...newTopics] };
                  }
                  return u;
                }),
              };
            }
            return sub;
          }),
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    saveTracks(updatedTracks);
    toast.success(`Bulk imported ${newTopics.length} topics!`);
  }, [activeTrack, tracks, saveTracks]);

  const updateTopic = useCallback((subjectId: string, unitId: string, topicId: string, updates: Partial<TrackerTopic>) => {
    if (!activeTrack) return;

    let unitJustCompleted = false;

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: track.subjects.map((sub) => {
            if (sub.id === subjectId) {
              return {
                ...sub,
                units: sub.units.map((u) => {
                  if (u.id === unitId) {
                    const nextTopics = u.topics.map((t) => {
                      if (t.id === topicId) {
                        const isNowDone = (updates.status === 'mastered' || updates.status === 'done') && t.status !== 'mastered' && t.status !== 'done';
                        if (isNowDone) {
                          awardXP(15, `Mastered topic: ${t.title}`);
                        }
                        return {
                          ...t,
                          ...updates,
                          completedAt: isNowDone ? Date.now() : t.completedAt,
                        };
                      }
                      return t;
                    });

                    const allDone = nextTopics.length > 0 && nextTopics.every((t) => t.status === 'mastered' || t.status === 'done');
                    const wasAllDone = u.topics.length > 0 && u.topics.every((t) => t.status === 'mastered' || t.status === 'done');
                    if (allDone && !wasAllDone) {
                      unitJustCompleted = true;
                    }

                    return { ...u, topics: nextTopics };
                  }
                  return u;
                }),
              };
            }
            return sub;
          }),
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    if (unitJustCompleted) {
      awardXP(75, 'Unit Complete Milestone');
      toast.success('🎉 Unit 100% Complete! +75 XP', { duration: 4000 });
    }

    saveTracks(updatedTracks);
  }, [activeTrack, tracks, saveTracks, awardXP]);

  const deleteTopic = useCallback((subjectId: string, unitId: string, topicId: string) => {
    if (!activeTrack) return;

    const updatedTracks = tracks.map((track) => {
      if (track.id === activeTrack.id) {
        return {
          ...track,
          subjects: track.subjects.map((sub) => {
            if (sub.id === subjectId) {
              return {
                ...sub,
                units: sub.units.map((u) => {
                  if (u.id === unitId) {
                    return { ...u, topics: u.topics.filter((t) => t.id !== topicId) };
                  }
                  return u;
                }),
              };
            }
            return sub;
          }),
          updatedAt: Date.now(),
        };
      }
      return track;
    });

    saveTracks(updatedTracks);
  }, [activeTrack, tracks, saveTracks]);

  const toggleTopicStatus = useCallback((subjectId: string, unitId: string, topicId: string) => {
    if (!activeTrack) return;
    const subject = activeTrack.subjects.find((s) => s.id === subjectId);
    const unit = subject?.units.find((u) => u.id === unitId);
    const topic = unit?.topics.find((t) => t.id === topicId);
    if (!topic) return;

    let nextStatus: TopicStatus = 'todo';
    if (topic.status === 'todo' || topic.status === 'pending') nextStatus = 'in-progress';
    else if (topic.status === 'in-progress') nextStatus = 'done';
    else if (topic.status === 'done' || topic.status === 'mastered') nextStatus = 'revised';
    else if (topic.status === 'revised') nextStatus = 'todo';

    updateTopic(subjectId, unitId, topicId, { status: nextStatus });
  }, [activeTrack, updateTopic]);

  // Export tracker data
  const exportTrackerData = useCallback((exportFormat: 'json' | 'csv') => {
    if (exportFormat === 'json') {
      const data = {
        exportedAt: new Date().toISOString(),
        settings: trackerSettings,
        activeTrack,
        allTracks: tracks,
        dailyLogs,
        testLogs,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyquest_prep_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded complete JSON backup!');
    } else {
      // CSV Export of Daily Logs
      const headers = ['Date', 'Day#', 'Weekday', 'ISO Week', 'Total Hours', 'DPP Done', 'DPP Score', 'Focus Rating', 'Notes'];
      const rows = dailyLogs.map((l) => [
        l.date,
        l.dayNumber,
        l.weekday,
        l.isoWeek,
        l.totalHours,
        l.dpp?.completed ? 'Yes' : 'No',
        l.dpp?.score !== undefined ? `${l.dpp.score}/${l.dpp.totalMarks || 10}` : '',
        l.focusRating || '',
        `"${(l.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyquest_daily_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded Daily Logs CSV!');
    }
  }, [trackerSettings, activeTrack, tracks, dailyLogs, testLogs]);

  return {
    tracks,
    activeTrack,
    activeTrackId,
    setActiveTrackId: (id: string) => {
      setActiveTrackId(id);
      try {
        localStorage.setItem(ACTIVE_TRACK_KEY, id);
      } catch { /* ignore */ }
    },
    dailyLogs,
    testLogs,
    trackerSettings,
    kpis,
    loading,
    createTrack,
    deleteTrack,
    loadPresetTemplate,
    addSubject,
    updateSubject,
    deleteSubject,
    addUnit,
    deleteUnit,
    addTopic,
    bulkAddTopics,
    updateTopic,
    deleteTopic,
    toggleTopicStatus,
    saveDailyLog,
    deleteDailyLog,
    saveTestLog,
    deleteTestLog,
    updateTrackerSettings,
    addHabit,
    updateHabit,
    deleteHabit,
    restoreHabit,
    exportTrackerData,
  };
}

