import { MlTier } from '@/types/ml';

export const tier7Data: MlTier = {
  id: 'tier7',
  tierNumber: 7,
  title: 'Deep Learning Foundations & MLOps',
  subtitle: 'Perceptrons, Activations, Backprop, Optimizers & Production Serving',
  badge: 'Advanced & MLOps',
  difficulty: 'Master',
  accentColor: '#a855f7', // Purple
  description:
    'Take the leap into deep representation learning and production systems engineering. Master artificial neural network architectures, non-linear activations (ReLU, Softmax), matrix backpropagation calculus, modern adaptive optimizers (Adam), and production MLOps (model serialization, drift monitoring, and REST serving).',
  concepts: [
    {
      id: 'neural_networks_activations',
      tierId: 'tier7',
      title: 'Neural Networks: Perceptrons, MLPs & Activations',
      category: 'Deep Learning & MLOps',
      difficulty: 'Intermediate',
      summary:
        'The artificial neuron (Perceptron), Multi-Layer Perceptron (MLP) architecture, and non-linear activation functions (Sigmoid, Tanh, ReLU, Leaky ReLU, Softmax).',
      estimatedMinutes: 30,
      tags: ['Neural Networks', 'Perceptron', 'MLP', 'ReLU', 'Softmax', 'Activation Functions'],
      intuition:
        'Imagine stacking dozens of sheets of tinted glass on top of each other. If every sheet of glass is completely flat and transparent, looking through 100 sheets gives you the exact same view as looking through 1 sheet. That is why neural networks need non-linear activations: without non-linear activation functions like ReLU or Sigmoid, a neural network with 100 hidden layers is mathematically identical to a simple, flat linear regression!',
      technicalExplanation:
        '### 1. The Artificial Neuron & The Multi-Layer Perceptron (MLP)\n\nAn artificial neuron computes an affine linear combination followed by an element-wise non-linear activation $g(\\cdot)$:\n$$z = \\sum_{j=1}^n w_j x_j + b = w^T x + b, \\quad a = g(z)$$\nIn a Multi-Layer Perceptron (MLP) with $L$ layers:\n- **Input Layer**: $a^{[0]} = x$.\n- **Hidden Layer $l$**:\n  $$Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]}, \\quad A^{[l]} = g^{[l]}(Z^{[l]})$$\n- **Output Layer $L$**: Produces final predictions $\\hat{y} = g^{[L]}(Z^{[L]})$.\n\n---\n\n### 2. The Universal Approximation Theorem (Cybenko, 1989 / Hornik, 1991)\n\nA feedforward neural network with a single hidden layer containing a finite number of neurons and non-linear activation functions can approximate any continuous function on compact subsets of $\\mathbb{R}^n$ to arbitrary precision.\n\n---\n\n### 3. Activation Functions Taxonomy\n\n1. **Sigmoid**: $\\sigma(z) = \\frac{1}{1 + e^{-z}}$\n   - Squeezes inputs to $(0, 1)$.\n   - **Vanishing Gradient Problem**: Derivative $\\sigma\'(z) = \\sigma(z)(1 - \\sigma(z))$ has a maximum value of only $0.25$ at $z=0$. Multiplying many layers causes gradients to shrink exponentially to zero, freezing weights in early layers.\n2. **Hyperbolic Tangent (Tanh)**: $\\tanh(z) = \\frac{e^z - e^{-z}}{e^z + e^{-z}}$\n   - Zero-centered range $(-1, +1)$. Strongly preferred over Sigmoid in hidden layers.\n3. **Rectified Linear Unit (ReLU)**: $g(z) = \\max(0, z)$\n   - **The modern standard** for hidden layers.\n   - Derivative is 1 for $z > 0$, completely eliminating vanishing gradients.\n   - Computationally fast (simple thresholding at zero).\n   - **Dying ReLU Trap**: Neurons with large negative bias never activate; gradient is zero forever.\n4. **Leaky ReLU**: $g(z) = \\max(\\alpha z, z)$ where $\\alpha \\approx 0.01$, keeping a small gradient alive when $z < 0$.\n5. **Softmax**: $\\text{Softmax}(z)_i = \\frac{e^{z_i}}{\\sum_{c=1}^C e^{z_c}}$\n   - Used exclusively in the output layer for multi-class classification, normalizing logits into a valid probability distribution that sums to 1.0.',
      mathFormulas: [
        {
          title: 'Softmax Multi-Class Activation',
          latex: '\\text{Softmax}(z_i) = \\frac{e^{z_i}}{\\sum_{c=1}^C e^{z_c}} \\quad \\text{where } \\sum_{i=1}^C \\text{Softmax}(z_i) = 1.0',
          explanation:
            'Exponentiates logits and normalizes by total sum, producing a calibrated posterior probability distribution.',
        },
        {
          title: 'Rectified Linear Unit (ReLU)',
          latex: 'f(z) = \\max(0, z), \\quad f\'(z) = \\begin{cases} 1 & \\text{if } z > 0 \\\\ 0 & \\text{if } z < 0 \\end{cases}',
          explanation:
            'Constant unit gradient for positive inputs eliminates vanishing gradients in deep networks.',
        },
      ],
      pythonSnippet: {
        title: 'Building a Multi-Layer Perceptron (MLP) with Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Trains an MLPClassifier with ReLU hidden layers, Adam optimizer, and early stopping on wine recognition data.',
        code: `import numpy as np
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.metrics import classification_report

# 1. Load multi-class dataset (3 classes of wine)
wine = load_wine()
X_train, X_test, y_train, y_test = train_test_split(
    wine.data, wine.target, test_size=0.3, random_state=42, stratify=wine.target
)

# 2. Build Pipeline: StandardScaler + MLPClassifier
# Architecture: 2 hidden layers with 32 and 16 neurons, ReLU activation, Adam optimizer
mlp = make_pipeline(
    StandardScaler(),
    MLPClassifier(
        hidden_layer_sizes=(32, 16),
        activation='relu',
        solver='adam',
        max_iter=300,
        random_state=42
    )
)

# 3. Train and Evaluate
mlp.fit(X_train, y_train)
y_pred = mlp.predict(X_test)

print("=== Multi-Layer Perceptron (MLP) Classifier ===")
print("Test Accuracy:", round(mlp.score(X_test, y_test), 3))
print("\\nClassification Report:\\n", classification_report(y_test, y_pred, target_names=wine.target_names))`,
      },
      keyTakeaways: [
        'Without non-linear activations, stacking multiple layers collapses mathematically into a single linear regression.',
        'ReLU is the default hidden layer activation because its unit gradient solves the vanishing gradient problem.',
        'Softmax is the standard output activation for multi-class classification, ensuring predictions sum to 1.0.',
        'Always scale input features before training neural networks to ensure gradients propagate stably.',
      ],
      prosAndCons: {
        pros: [
          'Universal function approximator: learns complex non-linear representations directly from raw inputs.',
          'Scales gracefully to high-dimensional unstructured data (images, audio, text).',
        ],
        cons: [
          'Black-box representations: internal hidden activations lack straightforward interpretability.',
          'Requires substantial training samples and hyperparameter tuning.',
        ],
      },
      interviewPrep: [
        {
          question: 'What is the vanishing gradient problem and how does ReLU solve it?',
          answer:
            'In deep networks using Sigmoid or Tanh activations, gradients are computed via the chain rule by multiplying local derivatives across layers. The derivative of Sigmoid is bounded at maximum 0.25 (and Tanh at 1.0, but near zero for large magnitudes). Multiplying many fractions smaller than 0.25 across dozens of layers causes the gradient signal to vanish exponentially toward zero as it travels back to early layers, preventing them from learning. ReLU solves this because its derivative is exactly 1.0 for all positive inputs (z > 0), allowing gradients to backpropagate freely without exponential attenuation.',
          trapOrTip:
            'Also mention the "Dying ReLU" failure mode and how Leaky ReLU or GELU mitigate it by maintaining a non-zero gradient for negative values.',
        },
      ],
    },
    {
      id: 'backprop_optimizers',
      tierId: 'tier7',
      title: 'Backpropagation, Computational Graphs & Optimizers',
      category: 'Deep Learning & MLOps',
      difficulty: 'Advanced',
      summary:
        'Matrix calculus chain rule, forward vs backward propagation, and modern optimization algorithms (Momentum, RMSprop, Adam).',
      estimatedMinutes: 30,
      tags: ['Backpropagation', 'Optimizers', 'Adam', 'Momentum', 'RMSprop', 'Chain Rule'],
      intuition:
        'Imagine a massive bucket brigade passing water along a chain to put out a fire. The forward pass is carrying water forward from source to flame. At the flame, you notice you missed the target by 2 feet. The backward pass (backpropagation) is shouting back down the line: "Everyone shift your buckets 2 feet to the left!" Every single person adjusts their stance based on their exact contribution to the mistake.',
      technicalExplanation:
        '### 1. The Multivariable Calculus Chain Rule\n\nBackpropagation is an efficient algorithmic implementation of the chain rule of calculus over a Directed Acyclic Graph (DAG) representing mathematical operations.\n\nFor an output layer error $\\delta^{[L]}$:\n$$\\delta^{[L]} = \\nabla_{A^{[L]}} \\mathcal{L} \\odot g\'(Z^{[L]})$$\nFor any preceding hidden layer $l$:\n$$\\delta^{[l]} = \\left( (W^{[l+1]})^T \\delta^{[l+1]} \\right) \\odot g\'(Z^{[l]})$$\nOnce the layer error vector $\\delta^{[l]}$ is computed, the parameter gradients are calculated via matrix multiplication:\n$$\\frac{\\partial \\mathcal{L}}{\\partial W^{[l]}} = \\frac{1}{m} \\delta^{[l]} (A^{[l-1]})^T, \\quad \\frac{\\partial \\mathcal{L}}{\\partial b^{[l]}} = \\frac{1}{m} \\sum_{i=1}^m \\delta^{[l](i)}$$\n\n---\n\n### 2. The Evolution of Optimizers\n\n1. **Standard SGD**: $w := w - \\alpha \\nabla J(w)$. High oscillations along ravines, easily trapped in saddle points.\n2. **SGD with Momentum**: Introduces physical velocity $v_t$ that accumulates past gradients:\n   $$v_t = \\beta v_{t-1} + (1 - \\beta) \\nabla J(w), \\quad w := w - \\alpha v_t$$\n   Dampens oscillations and speeds through flat plateaus.\n3. **RMSprop (Geoffrey Hinton)**: Maintains an exponentially decaying average of **squared gradients** $s_t$, scaling the learning rate inversely:\n   $$s_t = \\beta_2 s_{t-1} + (1 - \\beta_2) (\\nabla J(w))^2, \\quad w := w - \\frac{\\alpha}{\\sqrt{s_t} + \\epsilon} \\nabla J(w)$$\n4. **Adam (Adaptive Moment Estimation - Kingma & Ba, 2014)**:\n   The gold standard in deep learning. Combines **Momentum** (first moment $m_t$) and **RMSprop** (second raw moment $v_t$) with **bias corrections** $\\hat{m}_t$ and $\\hat{v}_t$ to compensate for zero initialization:\n   $$\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}, \\quad \\hat{v}_t = \\frac{v_t}{1 - \\beta_2^t}$$\n   $$w := w - \\frac{\\alpha}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t$$\n   Standard hyperparameter defaults: $\\alpha = 0.001$, $\\beta_1 = 0.9$, $\\beta_2 = 0.999$, $\\epsilon = 10^{-8}$.',
      mathFormulas: [
        {
          title: 'Adam Optimizer Parameter Update',
          latex: '\\theta_{t+1} = \\theta_t - \\frac{\\alpha}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t, \\quad \\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}, \\quad \\hat{v}_t = \\frac{v_t}{1 - \\beta_2^t}',
          explanation:
            'Combines moving average of past gradients (momentum) with moving average of squared gradients (RMSprop) plus bias correction.',
        },
      ],
      pythonSnippet: {
        title: 'Implementing the Adam Optimizer from First Principles in Python',
        isRunnableInDataForge: true,
        explanation:
          'Implements the Adam optimizer step update with first and second moment bias corrections in NumPy.',
        code: `import numpy as np

class AdamOptimizer:
    def __init__(self, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.m = None # 1st moment vector
        self.v = None # 2nd moment vector
        self.t = 0    # Timestep
        
    def step(self, w, grad):
        if self.m is None:
            self.m = np.zeros_like(w)
            self.v = np.zeros_like(w)
            
        self.t += 1
        # 1. Update biased 1st and 2nd moment estimates
        self.m = self.beta1 * self.m + (1 - self.beta1) * grad
        self.v = self.beta2 * self.v + (1 - self.beta2) * (grad ** 2)
        
        # 2. Compute bias-corrected moments
        m_hat = self.m / (1.0 - self.beta1 ** self.t)
        v_hat = self.v / (1.0 - self.beta2 ** self.t)
        
        # 3. Update parameters
        w_updated = w - (self.lr / (np.sqrt(v_hat) + self.eps)) * m_hat
        return w_updated

# Test Adam on a quadratic parameter optimization problem
optimizer = AdamOptimizer(lr=0.1)
w = np.array([10.0]) # Start far from optimum at 0.0

print("=== Adam Optimizer Iterations ===")
for step_num in range(1, 6):
    # Loss f(w) = w^2 -> Gradient df/dw = 2*w
    grad = 2.0 * w
    w = optimizer.step(w, grad)
    print(f"Step {step_num}: Parameter w = {w[0]:.4f}, Loss = {w[0]**2:.4f}")`,
      },
      keyTakeaways: [
        'Backpropagation recursively applies the multivariate chain rule from output layer backward to input.',
        'Momentum helps gradient descent barrel through shallow saddle points and dampens ravine oscillations.',
        'Adam automatically adapts per-parameter learning rates using both gradient moments and bias corrections.',
        'Default Adam parameters (beta1=0.9, beta2=0.999, lr=0.001) work remarkably well across 95% of architectures.',
      ],
      prosAndCons: {
        pros: [
          'Adaptive per-parameter learning rates eliminate the need for extensive manual learning rate decay schedules.',
          'Robust to sparse gradients and noisy objectives.',
        ],
        cons: [
          'Maintains two extra state tensors (m and v) per parameter, tripling optimizer memory footprint compared to vanilla SGD.',
        ],
      },
      interviewPrep: [
        {
          question: 'Why does the Adam optimizer need bias correction terms?',
          answer:
            'The first and second moment vectors m and v are initialized as vectors of zeros. During the initial training steps (especially when beta1 and beta2 are close to 1, like 0.9 and 0.999), the moving averages are heavily biased toward zero. The bias corrections m_hat = m / (1 - beta1^t) and v_hat = v / (1 - beta2^t) scale up the moments during early timesteps t. As t grows large, beta^t approaches zero, and the bias correction smoothly fades to 1.',
          trapOrTip:
            'Mention that Kingma & Ba introduced bias corrections specifically to prevent the optimizer from taking tiny steps in the initial epochs.',
        },
      ],
    },
    {
      id: 'mlops_model_serving',
      tierId: 'tier7',
      title: 'MLOps: Model Serialization, Drift & Production Serving',
      category: 'Deep Learning & MLOps',
      difficulty: 'Master',
      summary:
        'Model persistence with joblib and ONNX, detecting Covariate Shift vs Concept Drift, and production serving architectures.',
      estimatedMinutes: 25,
      tags: ['MLOps', 'Serialization', 'Model Drift', 'Covariate Shift', 'FastAPI', 'Serving'],
      intuition:
        'Training a machine learning model on your laptop is like cooking a gourmet meal for yourself. Deploying an MLOps pipeline is like opening a 24/7 restaurant chain serving 10,000 customers a minute: you need food safety inspections, inventory supply lines, cold storage, and real-time monitoring to detect if the ingredients have spoiled (data drift).',
      technicalExplanation:
        '### 1. Model Persistence & Serialization\n\n- **`joblib`**: The preferred Python serialization library for Scikit-Learn models. Efficiently stores large NumPy arrays contained inside estimators via memory mapping (`joblib.dump(model, "model.joblib")`).\n- **ONNX (Open Neural Network Exchange)**: A framework-agnostic open format. Allows training a model in PyTorch/Scikit-Learn and serving it inside a high-speed C++, Rust, or C# runtime via ONNX Runtime for sub-millisecond inference latency.\n\n---\n\n### 2. Model Degradation: The Two Types of Drift\n\nA model in production is a frozen mathematical snapshot of historical reality. As reality changes, model performance degrades:\n1. **Data Drift (Covariate Shift)**:\n   - The distribution of the input features shifts: $P_{\\text{train}}(X) \\ne P_{\\text{prod}}(X)$, but the conditional relationship $P(y \\mid X)$ remains unchanged.\n   - Example: An e-commerce model trained on young adults suddenly receives traffic from elderly users during the holidays.\n   - **Detection**: Kolmogorov-Smirnov (KS) test, Population Stability Index (PSI), or Wasserstein distance.\n2. **Concept Drift**:\n   - The actual relationship between features and target shifts: $P_{\\text{train}}(y \\mid X) \\ne P_{\\text{prod}}(y \\mid X)$.\n   - Example: Pre-COVID flight cancellation models suddenly failed when government travel bans were introduced. The exact same feature inputs now produce completely different real-world outcomes.\n   - **Detection**: Monitoring true performance metrics (F1-score, MAE) as verified ground-truth labels arrive.\n\n---\n\n### 3. Production Serving Patterns\n\n- **Real-Time REST / gRPC API**: Microservice built with FastAPI or Triton Inference Server. Receives single JSON payload, preprocesses, predicts in $<20\\text{ms}$, and returns score.\n- **Batch Offline Scoring**: Scheduled daily/hourly pipeline (e.g. Apache Spark / Airflow) computing predictions on millions of rows in a database table.',
      mathFormulas: [
        {
          title: 'Population Stability Index (PSI)',
          latex: '\\text{PSI} = \\sum_{b=1}^B \\left( \\% \\text{Actual}_b - \\% \\text{Expected}_b \\right) \\times \\ln\\left( \\frac{\\% \\text{Actual}_b}{\\% \\text{Expected}_b} \\right)',
          explanation:
            'Measures distribution divergence between baseline training data (Expected) and live production data (Actual); PSI > 0.2 indicates significant drift.',
        },
      ],
      pythonSnippet: {
        title: 'Model Serialization & Mock FastAPI Serving Script',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates serializing a Scikit-Learn pipeline to disk with joblib and loading it for zero-latency inference.',
        code: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
import io

# 1. Train and save production pipeline
X_train = np.array([[25, 50000], [45, 120000], [35, 75000], [22, 32000]])
y_train = np.array([0, 1, 1, 0])

pipeline = make_pipeline(StandardScaler(), LogisticRegression())
pipeline.fit(X_train, y_train)

# 2. In-memory serialization demo
import pickle
serialized_model = pickle.dumps(pipeline)
print("=== Production Model Serialized ===")
print(f"Serialized Model Buffer Size: {len(serialized_model)} bytes")

# 3. Simulate Production Serving Inference Request
loaded_pipeline = pickle.loads(serialized_model)
# Incoming user request: Age 38, Salary $90,000
new_user_features = np.array([[38, 90000]])

pred = loaded_pipeline.predict(new_user_features)[0]
prob = loaded_pipeline.predict_proba(new_user_features)[0][1]

print("\\n=== Live Production Inference Response ===")
print(f"Request Payload: Age=38, Salary=90,000")
print(f"Predicted Class: {pred}")
print(f"Approval Probability: {prob*100:.1f}%")`,
      },
      keyTakeaways: [
        'Production models inevitably degrade over time due to Covariate Shift and Concept Drift.',
        'Use Population Stability Index (PSI) to monitor feature input drift before true labels arrive.',
        'Always serialize complete end-to-end Pipelines (including feature scalers) to ensure identical inference preprocessing.',
        'ONNX Runtime allows deploying models cross-platform with hardware acceleration.',
      ],
      prosAndCons: {
        pros: [
          'Ensures models deliver real business value reliably 24/7 with zero downtime.',
          'Automated drift detection triggers proactive retraining before degradation affects revenue.',
        ],
        cons: [
          'Requires robust infrastructure (logging, monitoring, model registries, CI/CD).',
        ],
      },
      interviewPrep: [
        {
          question: 'What is the difference between Data Drift (Covariate Shift) and Concept Drift?',
          answer:
            'Data Drift (Covariate Shift) occurs when the distribution of input features P(X) changes over time, but the underlying mapping to target P(y | X) remains the same. Concept Drift occurs when the fundamental relationship between features and target P(y | X) changes, meaning that identical feature values now correspond to different targets (e.g. consumer spending behavior changes during a pandemic or financial crash).',
          trapOrTip:
            'State that Data Drift can be detected immediately on unlabelled production inputs using PSI or KS-tests, whereas Concept Drift can only be verified once true downstream ground-truth labels become available.',
        },
      ],
    },
  ],
};
