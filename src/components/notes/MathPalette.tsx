'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiArrowLeft } from 'react-icons/hi';
import Button from '@/components/ui/Button';

// ── Math Formula Categories & Templates ──
interface Placeholder {
  var: string;
  label: string;
  default: string;
}

interface FormulaTemplate {
  label: string;
  latex: string;
  description: string;
  latexPattern?: string;
  placeholders?: Placeholder[];
}

interface FormulaCategory {
  name: string;
  emoji: string;
  templates: FormulaTemplate[];
}

const FORMULA_CATEGORIES: FormulaCategory[] = [
  {
    name: 'Algebra',
    emoji: '🔢',
    templates: [
      {
        label: 'Fraction',
        latex: '\\frac{a}{b}',
        description: 'a divided by b',
        latexPattern: '\\frac{__a__}{__b__}',
        placeholders: [
          { var: 'a', label: 'Numerator (top)', default: 'a' },
          { var: 'b', label: 'Denominator (bottom)', default: 'b' }
        ]
      },
      {
        label: 'Exponent',
        latex: 'x^{n}',
        description: 'x to the power n',
        latexPattern: '__x__^{__n__}',
        placeholders: [
          { var: 'x', label: 'Base variable (x)', default: 'x' },
          { var: 'n', label: 'Power (n)', default: 'n' }
        ]
      },
      {
        label: 'Square Root',
        latex: '\\sqrt{x}',
        description: 'Square root of x',
        latexPattern: '\\sqrt{__x__}',
        placeholders: [
          { var: 'x', label: 'Radicand (inside root)', default: 'x' }
        ]
      },
      {
        label: 'Nth Root',
        latex: '\\sqrt[n]{x}',
        description: 'Nth root of x',
        latexPattern: '\\sqrt[__n__]{__x__}',
        placeholders: [
          { var: 'n', label: 'Root degree (n)', default: 'n' },
          { var: 'x', label: 'Radicand (inside root)', default: 'x' }
        ]
      },
      {
        label: 'Absolute Value',
        latex: '|x|',
        description: 'Absolute value of x',
        latexPattern: '|__x__|',
        placeholders: [
          { var: 'x', label: 'Value', default: 'x' }
        ]
      },
      {
        label: 'Quadratic Formula',
        latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        description: 'Solve ax² + bx + c = 0',
        latexPattern: '__x__ = \\frac{-__b__ \\pm \\sqrt{__b__^2 - 4__a____c__}}{2__a__}',
        placeholders: [
          { var: 'x', label: 'Result variable', default: 'x' },
          { var: 'a', label: 'Coefficient a', default: 'a' },
          { var: 'b', label: 'Coefficient b', default: 'b' },
          { var: 'c', label: 'Coefficient c', default: 'c' }
        ]
      },
      {
        label: 'Subscript',
        latex: 'x_{i}',
        description: 'x sub i',
        latexPattern: '__x___{__i__}',
        placeholders: [
          { var: 'x', label: 'Base variable', default: 'x' },
          { var: 'i', label: 'Subscript index', default: 'i' }
        ]
      },
      {
        label: 'Superscript + Subscript',
        latex: 'x_{i}^{n}',
        description: 'x sub i to the power n',
        latexPattern: '__x___{__i__}^{__n__}',
        placeholders: [
          { var: 'x', label: 'Base variable', default: 'x' },
          { var: 'i', label: 'Subscript index', default: 'i' },
          { var: 'n', label: 'Power (n)', default: 'n' }
        ]
      },
      {
        label: 'Logarithm',
        latex: '\\log_{b}(x)',
        description: 'Log base b of x',
        latexPattern: '\\log_{__b__}(__x__)',
        placeholders: [
          { var: 'b', label: 'Base', default: 'b' },
          { var: 'x', label: 'Value', default: 'x' }
        ]
      },
      {
        label: 'Natural Log',
        latex: '\\ln(x)',
        description: 'Natural logarithm of x',
        latexPattern: '\\ln(__x__)',
        placeholders: [
          { var: 'x', label: 'Value', default: 'x' }
        ]
      },
      { label: 'Inequality', latex: 'a \\leq b \\leq c', description: 'a ≤ b ≤ c' },
      { label: 'Plus Minus', latex: 'a \\pm b', description: 'a ± b' },
    ],
  },
  {
    name: 'Calculus',
    emoji: '📐',
    templates: [
      {
        label: 'Derivative',
        latex: '\\frac{dy}{dx}',
        description: 'First derivative',
        latexPattern: '\\frac{d__y__}{d__x__}',
        placeholders: [
          { var: 'y', label: 'Function (y)', default: 'y' },
          { var: 'x', label: 'Variable (x)', default: 'x' }
        ]
      },
      {
        label: 'Partial Derivative',
        latex: '\\frac{\\partial f}{\\partial x}',
        description: 'Partial derivative',
        latexPattern: '\\frac{\\partial __f__}{\\partial __x__}',
        placeholders: [
          { var: 'f', label: 'Function (f)', default: 'f' },
          { var: 'x', label: 'Variable (x)', default: 'x' }
        ]
      },
      {
        label: 'Second Derivative',
        latex: '\\frac{d^2y}{dx^2}',
        description: 'Second derivative',
        latexPattern: '\\frac{d^2__y__}{d__x__^2}',
        placeholders: [
          { var: 'y', label: 'Function (y)', default: 'y' },
          { var: 'x', label: 'Variable (x)', default: 'x' }
        ]
      },
      {
        label: 'Integral',
        latex: '\\int_{a}^{b} f(x)\\, dx',
        description: 'Definite integral',
        latexPattern: '\\int_{__a__}^{__b__} __f__\\, d__x__',
        placeholders: [
          { var: 'a', label: 'Lower limit', default: 'a' },
          { var: 'b', label: 'Upper limit', default: 'b' },
          { var: 'f', label: 'Integrand', default: 'f(x)' },
          { var: 'x', label: 'Variable', default: 'x' }
        ]
      },
      {
        label: 'Indefinite Integral',
        latex: '\\int f(x)\\, dx',
        description: 'Indefinite integral',
        latexPattern: '\\int __f__\\, d__x__',
        placeholders: [
          { var: 'f', label: 'Integrand', default: 'f(x)' },
          { var: 'x', label: 'Variable', default: 'x' }
        ]
      },
      {
        label: 'Limit',
        latex: '\\lim_{x \\to a} f(x)',
        description: 'Limit as x approaches a',
        latexPattern: '\\lim_{__x__ \\to __a__} __f__',
        placeholders: [
          { var: 'x', label: 'Variable', default: 'x' },
          { var: 'a', label: 'Target value', default: 'a' },
          { var: 'f', label: 'Function/Expression', default: 'f(x)' }
        ]
      },
      {
        label: 'Limit at Infinity',
        latex: '\\lim_{x \\to \\infty} f(x)',
        description: 'Limit as x → ∞',
        latexPattern: '\\lim_{__x__ \\to \\infty} __f__',
        placeholders: [
          { var: 'x', label: 'Variable', default: 'x' },
          { var: 'f', label: 'Function/Expression', default: 'f(x)' }
        ]
      },
      {
        label: 'Summation',
        latex: '\\sum_{i=1}^{n} a_i',
        description: 'Sum from i=1 to n',
        latexPattern: '\\sum_{__i__=__start__}^{__end__} __term__',
        placeholders: [
          { var: 'i', label: 'Index variable', default: 'i' },
          { var: 'start', label: 'Start value', default: '1' },
          { var: 'end', label: 'End value', default: 'n' },
          { var: 'term', label: 'Term expression', default: 'a_i' }
        ]
      },
      {
        label: 'Product',
        latex: '\\prod_{i=1}^{n} a_i',
        description: 'Product from i=1 to n',
        latexPattern: '\\prod_{__i__=__start__}^{__end__} __term__',
        placeholders: [
          { var: 'i', label: 'Index variable', default: 'i' },
          { var: 'start', label: 'Start value', default: '1' },
          { var: 'end', label: 'End value', default: 'n' },
          { var: 'term', label: 'Term expression', default: 'a_i' }
        ]
      },
      {
        label: 'Double Integral',
        latex: '\\iint_{D} f(x,y)\\, dA',
        description: 'Double integral over D',
        latexPattern: '\\iint_{__D__} __f__\\, dA',
        placeholders: [
          { var: 'D', label: 'Domain', default: 'D' },
          { var: 'f', label: 'Integrand', default: 'f(x,y)' }
        ]
      },
    ],
  },
  {
    name: 'Trigonometry',
    emoji: '📏',
    templates: [
      {
        label: 'Sine',
        latex: '\\sin(\\theta)',
        description: 'Sine function',
        latexPattern: '\\sin(__theta__)',
        placeholders: [{ var: 'theta', label: 'Angle', default: '\\theta' }]
      },
      {
        label: 'Cosine',
        latex: '\\cos(\\theta)',
        description: 'Cosine function',
        latexPattern: '\\cos(__theta__)',
        placeholders: [{ var: 'theta', label: 'Angle', default: '\\theta' }]
      },
      {
        label: 'Tangent',
        latex: '\\tan(\\theta)',
        description: 'Tangent function',
        latexPattern: '\\tan(__theta__)',
        placeholders: [{ var: 'theta', label: 'Angle', default: '\\theta' }]
      },
      { label: 'Pythagorean Identity', latex: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1', description: 'sin² + cos² = 1' },
      {
        label: 'Inverse Sine',
        latex: '\\sin^{-1}(x)',
        description: 'Arc sine',
        latexPattern: '\\sin^{-1}(__x__)',
        placeholders: [{ var: 'x', label: 'Value', default: 'x' }]
      },
      { label: 'Angle (Theta)', latex: '\\theta', description: 'Greek letter theta' },
      { label: 'Pi', latex: '\\pi', description: 'Pi constant' },
    ],
  },
  {
    name: 'Statistics',
    emoji: '📊',
    templates: [
      {
        label: 'Mean',
        latex: '\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i',
        description: 'Arithmetic mean',
        latexPattern: '\\bar{__x__} = \\frac{1}{__n__} \\sum_{__i__=1}^{__n__} __x___{__i__}',
        placeholders: [
          { var: 'x', label: 'Variable symbol', default: 'x' },
          { var: 'n', label: 'Sample size (n)', default: 'n' },
          { var: 'i', label: 'Index variable', default: 'i' }
        ]
      },
      {
        label: 'Standard Deviation',
        latex: '\\sigma = \\sqrt{\\frac{1}{n} \\sum_{i=1}^{n} (x_i - \\mu)^2}',
        description: 'Population std dev',
        latexPattern: '\\sigma = \\sqrt{\\frac{1}{__n__} \\sum_{__i__=1}^{__n__} (__x___{__i__} - __mu__)^2}',
        placeholders: [
          { var: 'x', label: 'Variable', default: 'x' },
          { var: 'n', label: 'Size', default: 'n' },
          { var: 'i', label: 'Index', default: 'i' },
          { var: 'mu', label: 'Mean (\\mu)', default: '\\mu' }
        ]
      },
      {
        label: 'Variance',
        latex: '\\sigma^2 = \\frac{1}{n} \\sum_{i=1}^{n} (x_i - \\mu)^2',
        description: 'Variance formula',
        latexPattern: '\\sigma^2 = \\frac{1}{__n__} \\sum_{__i__=1}^{__n__} (__x___{__i__} - __mu__)^2}',
        placeholders: [
          { var: 'x', label: 'Variable', default: 'x' },
          { var: 'n', label: 'Size', default: 'n' },
          { var: 'i', label: 'Index', default: 'i' },
          { var: 'mu', label: 'Mean (\\mu)', default: '\\mu' }
        ]
      },
      {
        label: 'Probability',
        latex: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
        description: "Bayes' theorem",
        latexPattern: 'P(__A__|__B__) = \\frac{P(__B__|__A__) \\cdot P(__A__)}{P(__B__)}',
        placeholders: [
          { var: 'A', label: 'Event A', default: 'A' },
          { var: 'B', label: 'Event B', default: 'B' }
        ]
      },
      {
        label: 'Combination',
        latex: '\\binom{n}{k} = \\frac{n!}{k!(n-k)!}',
        description: 'n choose k',
        latexPattern: '\\binom{__n__}{__k__} = \\frac{__n__!}{__k__!(__n__-__k__)!}',
        placeholders: [
          { var: 'n', label: 'Total items (n)', default: 'n' },
          { var: 'k', label: 'Chosen items (k)', default: 'k' }
        ]
      },
      {
        label: 'Z-Score',
        latex: 'z = \\frac{x - \\mu}{\\sigma}',
        description: 'Standard score',
        latexPattern: 'z = \\frac{__x__ - __mu__}{__sigma__}',
        placeholders: [
          { var: 'x', label: 'Value (x)', default: 'x' },
          { var: 'mu', label: 'Mean (\\mu)', default: '\\mu' },
          { var: 'sigma', label: 'Std dev (\\sigma)', default: '\\sigma' }
        ]
      },
    ],
  },
  {
    name: 'Physics',
    emoji: '⚛️',
    templates: [
      {
        label: 'Force',
        latex: 'F = ma',
        description: "Newton's second law",
        latexPattern: 'F = __m____a__',
        placeholders: [
          { var: 'm', label: 'Mass (m)', default: 'm' },
          { var: 'a', label: 'Acceleration (a)', default: 'a' }
        ]
      },
      {
        label: 'Kinetic Energy',
        latex: 'E_k = \\frac{1}{2}mv^2',
        description: 'Kinetic energy',
        latexPattern: 'E_k = \\frac{1}{2}__m____v__^2',
        placeholders: [
          { var: 'm', label: 'Mass (m)', default: 'm' },
          { var: 'v', label: 'Velocity (v)', default: 'v' }
        ]
      },
      {
        label: 'Potential Energy',
        latex: 'E_p = mgh',
        description: 'Gravitational PE',
        latexPattern: 'E_p = __m__g__h__',
        placeholders: [
          { var: 'm', label: 'Mass (m)', default: 'm' },
          { var: 'h', label: 'Height (h)', default: 'h' }
        ]
      },
      {
        label: "Einstein's E=mc²",
        latex: 'E = mc^2',
        description: 'Mass-energy equivalence',
        latexPattern: 'E = __m__c^2',
        placeholders: [{ var: 'm', label: 'Mass (m)', default: 'm' }]
      },
      {
        label: 'Velocity',
        latex: 'v = \\frac{\\Delta x}{\\Delta t}',
        description: 'Velocity formula',
        latexPattern: 'v = \\frac{\\Delta __x__}{\\Delta __t__}',
        placeholders: [
          { var: 'x', label: 'Distance (x)', default: 'x' },
          { var: 't', label: 'Time (t)', default: 't' }
        ]
      },
      {
        label: "Ohm's Law",
        latex: 'V = IR',
        description: 'Voltage = Current × Resistance',
        latexPattern: 'V = __I____R__',
        placeholders: [
          { var: 'I', label: 'Current (I)', default: 'I' },
          { var: 'R', label: 'Resistance (R)', default: 'R' }
        ]
      },
    ],
  },
  {
    name: 'Chemistry',
    emoji: '🧪',
    templates: [
      {
        label: 'pH Formula',
        latex: 'pH = -\\log[H^+]',
        description: 'pH of a solution',
        latexPattern: 'pH = -\\log[__H__^+]',
        placeholders: [{ var: 'H', label: 'H+ concentration', default: 'H' }]
      },
      {
        label: 'Ideal Gas Law',
        latex: 'PV = nRT',
        description: 'Ideal gas equation',
        latexPattern: '__P____V__ = __n__R__T__',
        placeholders: [
          { var: 'P', label: 'Pressure (P)', default: 'P' },
          { var: 'V', label: 'Volume (V)', default: 'V' },
          { var: 'n', label: 'Moles (n)', default: 'n' },
          { var: 'T', label: 'Temp (T)', default: 'T' }
        ]
      },
      {
        label: 'Molarity',
        latex: 'M = \\frac{n}{V}',
        description: 'Concentration (mol/L)',
        latexPattern: 'M = \\frac{__n__}{__V__}',
        placeholders: [
          { var: 'n', label: 'Moles (n)', default: 'n' },
          { var: 'V', label: 'Volume in Liters (V)', default: 'V' }
        ]
      },
    ],
  },
  {
    name: 'Greek & Symbols',
    emoji: '🔣',
    templates: [
      { label: 'Alpha', latex: '\\alpha', description: 'α' },
      { label: 'Beta', latex: '\\beta', description: 'β' },
      { label: 'Gamma', latex: '\\gamma', description: 'γ' },
      { label: 'Delta', latex: '\\Delta', description: 'Δ (uppercase)' },
      { label: 'Epsilon', latex: '\\epsilon', description: 'ε' },
      { label: 'Lambda', latex: '\\lambda', description: 'λ' },
      { label: 'Sigma', latex: '\\sigma', description: 'σ' },
      { label: 'Omega', latex: '\\omega', description: 'ω' },
      { label: 'Infinity', latex: '\\infty', description: '∞' },
      { label: 'Not Equal', latex: '\\neq', description: '≠' },
      { label: 'Approximately', latex: '\\approx', description: '≈' },
      { label: 'Proportional', latex: '\\propto', description: '∝' },
      { label: 'Therefore', latex: '\\therefore', description: '∴' },
    ],
  },
  {
    name: 'Matrices',
    emoji: '🧮',
    templates: [
      {
        label: '2×2 Matrix',
        latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
        description: '2×2 matrix',
        latexPattern: '\\begin{pmatrix} __a__ & __b__ \\\\ __c__ & __d__ \\end{pmatrix}',
        placeholders: [
          { var: 'a', label: 'Row 1, Col 1', default: 'a' },
          { var: 'b', label: 'Row 1, Col 2', default: 'b' },
          { var: 'c', label: 'Row 2, Col 1', default: 'c' },
          { var: 'd', label: 'Row 2, Col 2', default: 'd' }
        ]
      },
      {
        label: 'Determinant',
        latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
        description: 'Determinant notation',
        latexPattern: '\\begin{vmatrix} __a__ & __b__ \\\\ __c__ & __d__ \\end{vmatrix}',
        placeholders: [
          { var: 'a', label: 'Row 1, Col 1', default: 'a' },
          { var: 'b', label: 'Row 1, Col 2', default: 'b' },
          { var: 'c', label: 'Row 2, Col 1', default: 'c' },
          { var: 'd', label: 'Row 2, Col 2', default: 'd' }
        ]
      },
    ],
  },
];

interface MathPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string, isBlock: boolean) => void;
  editLatex?: string;
  editIsBlock?: boolean;
}

const staticPreviewCache: Record<string, string> = {};

export default function MathPalette({ isOpen, onClose, onInsert, editLatex = '', editIsBlock = false }: MathPaletteProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const [previewHtml, setPreviewHtml] = useState<Record<string, string>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  // Parameter Configuration states
  const [selectedTemplate, setSelectedTemplate] = useState<FormulaTemplate | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [isBlockMode, setIsBlockMode] = useState(false);
  const [livePreviewHtml, setLivePreviewHtml] = useState('');

  // Handle Edit Mode from parent
  useEffect(() => {
    if (isOpen && editLatex) {
      // Set to custom edit template
      setSelectedTemplate({
        label: 'Edit Math Formula',
        latex: editLatex,
        description: 'Modify the raw LaTeX formula directly.',
        latexPattern: '__latex__',
        placeholders: [{ var: 'latex', label: 'LaTeX Code', default: editLatex }]
      });
      setPlaceholderValues({ latex: editLatex });
      setIsBlockMode(editIsBlock);
    } else if (isOpen) {
      setSelectedTemplate(null);
      setPlaceholderValues({});
      setIsBlockMode(false);
    }
  }, [isOpen, editLatex, editIsBlock]);

  // Render static previews for the template selection screen
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const renderPreviews = async () => {
      try {
        const katex = (await import('katex')).default;
        const rendered: Record<string, string> = {};
        for (const cat of FORMULA_CATEGORIES) {
          for (const tmpl of cat.templates) {
            if (staticPreviewCache[tmpl.latex]) {
              rendered[tmpl.latex] = staticPreviewCache[tmpl.latex];
              continue;
            }
            try {
              const html = katex.renderToString(tmpl.latex, {
                throwOnError: false,
                displayMode: false,
                output: 'html',
              });
              staticPreviewCache[tmpl.latex] = html;
              rendered[tmpl.latex] = html;
            } catch {
              rendered[tmpl.latex] = `<span style="color:red">${tmpl.latex}</span>`;
            }
          }
        }
        if (!cancelled) setPreviewHtml(rendered);
      } catch (e) {
        console.warn('KaTeX not available for previews:', e);
      }
    };

    renderPreviews();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Live preview logic for the parameter configuration screen
  useEffect(() => {
    if (!selectedTemplate) {
      setLivePreviewHtml('');
      return;
    }

    const renderLivePreview = async () => {
      try {
        const katex = (await import('katex')).default;
        
        let currentLatex = selectedTemplate.latex;
        if (selectedTemplate.latexPattern && selectedTemplate.placeholders) {
          currentLatex = selectedTemplate.latexPattern;
          selectedTemplate.placeholders.forEach((p) => {
            const val = placeholderValues[p.var] !== undefined ? placeholderValues[p.var] : p.default;
            currentLatex = currentLatex.replaceAll(`__${p.var}__`, val || ' ');
          });
        }

        const html = katex.renderToString(currentLatex || ' ', {
          throwOnError: false,
          displayMode: isBlockMode,
          output: 'html'
        });
        setLivePreviewHtml(html);
      } catch {
        setLivePreviewHtml('<span style="color:red">Formatting error</span>');
      }
    };

    renderLivePreview();
  }, [selectedTemplate, placeholderValues, isBlockMode]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && !editLatex) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearch('');
    }
  }, [isOpen, editLatex]);

  // Filter templates
  const filteredCategories = search.trim()
    ? FORMULA_CATEGORIES.map((cat) => ({
        ...cat,
        templates: cat.templates.filter((t) =>
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.latex.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.templates.length > 0)
    : [FORMULA_CATEGORIES[activeCategory]];

  const handleInsert = () => {
    if (!selectedTemplate) return;

    let finalLatex = selectedTemplate.latex;
    if (selectedTemplate.latexPattern && selectedTemplate.placeholders) {
      finalLatex = selectedTemplate.latexPattern;
      selectedTemplate.placeholders.forEach((p) => {
        const val = placeholderValues[p.var] !== undefined ? placeholderValues[p.var] : p.default;
        finalLatex = finalLatex.replaceAll(`__${p.var}__`, val || ' ');
      });
    }

    onInsert(finalLatex, isBlockMode);
    setSelectedTemplate(null);
    setPlaceholderValues({});
    setIsBlockMode(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl min-h-[450px] max-h-[85vh] rounded-2xl border-2 border-[var(--card-border)] overflow-hidden flex flex-col"
          style={{ background: 'var(--card-bg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--card-border)]">
            <div className="flex items-center gap-2">
              <span className="text-lg text-primary font-bold">∑</span>
              <h2 className="text-base font-heading font-bold">
                {editLatex ? 'Edit Math Formula' : 'Math Formula Palette'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--card-border)] transition-colors">
              <HiX size={18} />
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {selectedTemplate ? (
              /* --- PARAMETER CONFIGURATION VIEW --- */
              <div className="p-6 flex flex-col gap-5 flex-1 justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {!editLatex && (
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="p-1.5 rounded-lg hover:bg-[var(--card-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      >
                        <HiArrowLeft size={16} />
                      </button>
                    )}
                    <div>
                      <h3 className="text-sm font-heading font-bold">{selectedTemplate.label}</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">{selectedTemplate.description}</p>
                    </div>
                  </div>

                  {/* Input Fields for variables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {selectedTemplate.placeholders?.map((p) => (
                      <div key={p.var} className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                          {p.label}
                        </label>
                        {p.var === 'latex' ? (
                          <textarea
                            value={placeholderValues[p.var] || ''}
                            onChange={(e) => setPlaceholderValues(prev => ({ ...prev, [p.var]: e.target.value }))}
                            className="w-full h-24 px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-mono focus:border-primary focus:outline-none transition-colors"
                            placeholder={p.default}
                          />
                        ) : (
                          <input
                            type="text"
                            value={placeholderValues[p.var] || ''}
                            onChange={(e) => setPlaceholderValues(prev => ({ ...prev, [p.var]: e.target.value }))}
                            className="px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm focus:border-primary focus:outline-none transition-colors"
                            placeholder={p.default}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Display Mode Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]/40 mt-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">Display Layout</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {isBlockMode ? 'Centered standalone block' : 'Flows inline with normal text'}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setIsBlockMode(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          !isBlockMode
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-transparent'
                        }`}
                      >
                        Inline ($)
                      </button>
                      <button
                        onClick={() => setIsBlockMode(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          isBlockMode
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-transparent'
                        }`}
                      >
                        Block ($$)
                      </button>
                    </div>
                  </div>

                  {/* Live Math Equation Preview */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Equation Preview
                    </span>
                    <div className="w-full min-h-[90px] p-4 rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card-bg)]/20 flex items-center justify-center overflow-x-auto">
                      <div className="studyquest-markdown" dangerouslySetInnerHTML={{ __html: livePreviewHtml || ' ' }} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-[var(--card-border)]">
                  {!editLatex && (
                    <Button variant="ghost" onClick={() => setSelectedTemplate(null)} className="flex-1">
                      Cancel
                    </Button>
                  )}
                  <Button variant="primary" onClick={handleInsert} className="flex-1">
                    {editLatex ? 'Save Changes' : 'Insert Formula'}
                  </Button>
                </div>
              </div>
            ) : (
              /* --- TEMPLATE SELECTION VIEW --- */
              <div className="flex flex-col flex-1 min-h-0">
                {/* Search */}
                <div className="px-5 py-3 border-b border-[var(--card-border)]">
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search formulas... (e.g. integral, square root, force)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--card-border)] bg-transparent text-sm focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-1 min-h-0">
                  {/* Category sidebar */}
                  {!search.trim() && (
                    <div className="w-40 shrink-0 border-r border-[var(--card-border)] overflow-y-auto py-2">
                      {FORMULA_CATEGORIES.map((cat, idx) => (
                        <button
                          key={cat.name}
                          onClick={() => setActiveCategory(idx)}
                          className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-all flex items-center gap-2 ${
                            activeCategory === idx
                              ? 'bg-primary/10 text-primary border-r-2 border-primary'
                              : 'text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/50 hover:text-[var(--foreground)]'
                          }`}
                        >
                          <span className="text-sm">{cat.emoji}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Templates grid */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {filteredCategories.map((cat) => (
                      <div key={cat.name} className="mb-4">
                        {search.trim() && (
                          <h3 className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span>{cat.emoji}</span> {cat.name}
                          </h3>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {cat.templates.map((tmpl) => (
                            <button
                              key={tmpl.latex}
                              onClick={() => {
                                if (tmpl.placeholders) {
                                  // Open parameters configure panel
                                  setSelectedTemplate(tmpl);
                                  setPlaceholderValues({});
                                } else {
                                  // No placeholders, insert directly
                                  onInsert(tmpl.latex, false);
                                  onClose();
                                }
                              }}
                              className="group text-left p-3.5 rounded-2xl border-2 border-[var(--card-border)] hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="text-xs font-black text-[var(--foreground)] group-hover:text-primary transition-colors mb-1">
                                  {tmpl.label}
                                </div>
                                <div className="text-[10px] text-[var(--muted-foreground)] mb-3 leading-snug">
                                  {tmpl.description}
                                </div>
                              </div>
                              <div
                                className="w-full flex items-center justify-center p-2 rounded-xl bg-[var(--card-bg)]/80 min-h-[50px] overflow-hidden border border-[var(--card-border)] group-hover:border-primary/20"
                                dangerouslySetInnerHTML={{
                                  __html: previewHtml[tmpl.latex] || `<code style="font-size:10px;opacity:0.6">${tmpl.latex}</code>`,
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {filteredCategories.length === 0 && (
                      <div className="text-center py-12">
                        <span className="text-3xl block mb-2">🔍</span>
                        <p className="text-sm text-[var(--muted-foreground)]">No formulas match &quot;{search}&quot;</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-[var(--card-border)] text-[10px] text-[var(--muted-foreground)] flex items-center gap-4">
            <span>💡 <strong>Tip:</strong> Click any formula containing parameters to customize its values before inserting!</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
