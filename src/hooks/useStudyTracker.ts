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
} from '@/types';
import { useGamification } from '@/hooks/useGamification';
import { useAuthContext } from '@/context/AuthContext';

const STORAGE_KEY = 'studyquest_syllabus_tracker_v1';
const ACTIVE_TRACK_KEY = 'studyquest_active_track_id';

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
];

export function useStudyTracker() {
  const { user } = useAuthContext();
  const { awardXP } = useGamification();
  const [tracks, setTracks] = useState<SyllabusTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize with Firebase Firestore when logged in, or fallback to localStorage
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
        console.error('Error initializing StudyTracker state:', e);
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  // Sync state both locally and to Cloud Firestore
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

  // Active track
  const activeTrack = useMemo(() => {
    return tracks.find((t) => t.id === activeTrackId) || tracks[0] || null;
  }, [tracks, activeTrackId]);

  // Compute Dynamic Real KPIs (NO FAKE / MOCK NUMBERS)
  const kpis: TrackerKPIs = useMemo(() => {
    if (!activeTrack) {
      return {
        totalTopics: 0,
        completedTopics: 0,
        inProgressTopics: 0,
        todoTopics: 0,
        overallCompletionPct: 0,
        weightedReadinessScore: 0,
        averageConfidence: 0,
        totalSubjects: 0,
        weakTopicsCount: 0,
        estimatedHoursLeft: 0,
        completedThisWeekCount: 0,
      };
    }

    let totalTopics = 0;
    let completedTopics = 0;
    let inProgressTopics = 0;
    let todoTopics = 0;
    let estimatedHoursLeft = 0;
    let completedThisWeekCount = 0;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    activeTrack.subjects.forEach((subject) => {
      subject.units.forEach((unit) => {
        unit.topics.forEach((topic) => {
          totalTopics++;

          if (topic.status === 'mastered') {
            completedTopics++;
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

    const overallCompletionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return {
      totalTopics,
      completedTopics,
      inProgressTopics,
      todoTopics,
      overallCompletionPct,
      weightedReadinessScore: overallCompletionPct,
      averageConfidence: 0,
      totalSubjects: activeTrack.subjects.length,
      weakTopicsCount: inProgressTopics,
      estimatedHoursLeft,
      completedThisWeekCount,
    };
  }, [activeTrack]);

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

  // Topic CRUD Actions & Gamification Trigger
  const addTopic = useCallback((subjectId: string, unitId: string, title: string, confidence: number = 0, estimatedHours: number = 2) => {
    if (!activeTrack) return;

    const newTopic: TrackerTopic = {
      id: uuidv4(),
      title,
      status: 'todo',
      confidence: 0,
      revisionCount: 0,
      estimatedHours,
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
                        const isNowMastered = updates.status === 'mastered' && t.status !== 'mastered';
                        if (isNowMastered) {
                          awardXP(15, `Mastered topic: ${t.title}`);
                        }
                        return {
                          ...t,
                          ...updates,
                          completedAt: updates.status === 'mastered' ? Date.now() : t.completedAt,
                        };
                      }
                      return t;
                    });

                    const allDone = nextTopics.length > 0 && nextTopics.every((t) => t.status === 'mastered');
                    const wasAllDone = u.topics.length > 0 && u.topics.every((t) => t.status === 'mastered');
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
    if (topic.status === 'todo') nextStatus = 'in-progress';
    else if (topic.status === 'in-progress') nextStatus = 'mastered';
    else if (topic.status === 'mastered') nextStatus = 'todo';

    updateTopic(subjectId, unitId, topicId, { status: nextStatus });
  }, [activeTrack, updateTopic]);

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
  };
}
