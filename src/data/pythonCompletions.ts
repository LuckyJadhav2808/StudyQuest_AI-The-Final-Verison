/**
 * StudyQuest AI — Data Forge Python Autocomplete Dictionary
 * Common signatures and docstrings for Pandas, NumPy, Matplotlib, Seaborn, and Scikit-Learn.
 */

export interface PythonCompletionItem {
  name: string;
  signature: string;
  insertText: string;
  doc: string;
  type: 'method' | 'attribute' | 'function';
}

export const PYTHON_COMPLETIONS: Record<string, PythonCompletionItem[]> = {
  // --- Pandas DataFrame (df.) ---
  df: [
    { name: 'head', signature: 'head(n=5)', insertText: 'head()', doc: 'Return the first n rows of the DataFrame.', type: 'method' },
    { name: 'tail', signature: 'tail(n=5)', insertText: 'tail()', doc: 'Return the last n rows of the DataFrame.', type: 'method' },
    { name: 'describe', signature: 'describe()', insertText: 'describe()', doc: 'Generate descriptive statistics summarizing central tendency and dispersion.', type: 'method' },
    { name: 'info', signature: 'info()', insertText: 'info()', doc: 'Print a concise summary of DataFrame columns, non-null counts, and dtypes.', type: 'method' },
    { name: 'shape', signature: 'shape -> (rows, cols)', insertText: 'shape', doc: 'Return a tuple representing the dimensionality of the DataFrame.', type: 'attribute' },
    { name: 'columns', signature: 'columns -> Index', insertText: 'columns', doc: 'The column labels of the DataFrame.', type: 'attribute' },
    { name: 'dtypes', signature: 'dtypes -> Series', insertText: 'dtypes', doc: 'Return the dtypes in the DataFrame.', type: 'attribute' },
    { name: 'isnull', signature: 'isnull().sum()', insertText: 'isnull().sum()', doc: 'Detect missing values across columns.', type: 'method' },
    { name: 'dropna', signature: 'dropna(axis=0, how="any")', insertText: 'dropna()', doc: 'Remove missing values along an axis.', type: 'method' },
    { name: 'fillna', signature: 'fillna(value)', insertText: 'fillna()', doc: 'Fill NA/NaN values using the specified method or value.', type: 'method' },
    { name: 'groupby', signature: 'groupby(by)', insertText: 'groupby("")', doc: 'Group DataFrame using a mapper or Series of columns.', type: 'method' },
    { name: 'value_counts', signature: 'value_counts()', insertText: 'value_counts()', doc: 'Return a Series containing counts of unique rows/values.', type: 'method' },
    { name: 'corr', signature: 'corr(method="pearson")', insertText: 'corr()', doc: 'Compute pairwise correlation of numeric columns.', type: 'method' },
    { name: 'drop', signature: 'drop(columns=[...])', insertText: 'drop(columns=[])', doc: 'Drop specified labels from rows or columns.', type: 'method' },
    { name: 'merge', signature: 'merge(right, on="id")', insertText: 'merge()', doc: 'Merge DataFrame or named Series objects with a database-style join.', type: 'method' },
    { name: 'sort_values', signature: 'sort_values(by, ascending=True)', insertText: 'sort_values(by="")', doc: 'Sort by the values along either axis.', type: 'method' },
    { name: 'select_dtypes', signature: 'select_dtypes(include=[...])', insertText: 'select_dtypes(include=["number"])', doc: 'Return a subset of the columns based on their dtype.', type: 'method' },
    { name: 'copy', signature: 'copy(deep=True)', insertText: 'copy()', doc: 'Make a deep copy of this object’s indices and data.', type: 'method' },
    { name: 'plot', signature: 'plot(kind="line")', insertText: 'plot()', doc: 'Make plots of Series or DataFrame.', type: 'method' },
  ],

  // --- Pandas Library (pd.) ---
  pd: [
    { name: 'read_csv', signature: 'read_csv(filepath_or_buffer)', insertText: 'read_csv("")', doc: 'Read a comma-separated values (csv) file into DataFrame.', type: 'function' },
    { name: 'DataFrame', signature: 'DataFrame(data, columns=[...])', insertText: 'DataFrame()', doc: 'Two-dimensional, size-mutable, potentially heterogeneous tabular data.', type: 'function' },
    { name: 'Series', signature: 'Series(data, index=[...])', insertText: 'Series()', doc: 'One-dimensional ndarray with axis labels.', type: 'function' },
    { name: 'concat', signature: 'concat(objs, axis=0)', insertText: 'concat([])', doc: 'Concatenate pandas objects along a particular axis.', type: 'function' },
    { name: 'merge', signature: 'merge(left, right, on=...)', insertText: 'merge()', doc: 'Merge DataFrame objects with a database-style join.', type: 'function' },
    { name: 'get_dummies', signature: 'get_dummies(data, drop_first=True)', insertText: 'get_dummies(df, drop_first=True)', doc: 'Convert categorical variable into dummy/indicator variables.', type: 'function' },
    { name: 'to_datetime', signature: 'to_datetime(arg)', insertText: 'to_datetime()', doc: 'Convert argument to datetime.', type: 'function' },
    { name: 'to_numeric', signature: 'to_numeric(arg, errors="coerce")', insertText: 'to_numeric()', doc: 'Convert argument to a numeric type.', type: 'function' },
  ],

  // --- NumPy (np.) ---
  np: [
    { name: 'array', signature: 'array(object, dtype=None)', insertText: 'array([])', doc: 'Create an array from a list or tuple.', type: 'function' },
    { name: 'zeros', signature: 'zeros(shape, dtype=float)', insertText: 'zeros(())', doc: 'Return a new array of given shape and type, filled with zeros.', type: 'function' },
    { name: 'ones', signature: 'ones(shape, dtype=float)', insertText: 'ones(())', doc: 'Return a new array of given shape and type, filled with ones.', type: 'function' },
    { name: 'arange', signature: 'arange([start,] stop[, step,])', insertText: 'arange()', doc: 'Return evenly spaced values within a given interval.', type: 'function' },
    { name: 'linspace', signature: 'linspace(start, stop, num=50)', insertText: 'linspace(0, 1, 50)', doc: 'Return evenly spaced numbers over a specified interval.', type: 'function' },
    { name: 'mean', signature: 'mean(a, axis=None)', insertText: 'mean()', doc: 'Compute the arithmetic mean along the specified axis.', type: 'function' },
    { name: 'median', signature: 'median(a, axis=None)', insertText: 'median()', doc: 'Compute the median along the specified axis.', type: 'function' },
    { name: 'std', signature: 'std(a, axis=None)', insertText: 'std()', doc: 'Compute the standard deviation along the specified axis.', type: 'function' },
    { name: 'sum', signature: 'sum(a, axis=None)', insertText: 'sum()', doc: 'Sum of array elements over a given axis.', type: 'function' },
    { name: 'dot', signature: 'dot(a, b)', insertText: 'dot()', doc: 'Dot product of two arrays.', type: 'function' },
    { name: 'random', signature: 'random.seed(42)', insertText: 'random.', doc: 'NumPy pseudo-random number generator module.', type: 'attribute' },
    { name: 'argmax', signature: 'argmax(a, axis=None)', insertText: 'argmax()', doc: 'Returns the indices of the maximum values along an axis.', type: 'function' },
    { name: 'argmin', signature: 'argmin(a, axis=None)', insertText: 'argmin()', doc: 'Returns the indices of the minimum values along an axis.', type: 'function' },
  ],

  // --- Matplotlib Pyplot (plt.) ---
  plt: [
    { name: 'figure', signature: 'figure(figsize=(8, 5), dpi=100)', insertText: 'figure(figsize=(8, 5))', doc: 'Create a new figure, or activate an existing figure.', type: 'function' },
    { name: 'plot', signature: 'plot(x, y, label=...)', insertText: 'plot()', doc: 'Plot y versus x as lines and/or markers.', type: 'function' },
    { name: 'scatter', signature: 'scatter(x, y, c=..., alpha=...)', insertText: 'scatter()', doc: 'A scatter plot of y vs. x with varying marker size and/or color.', type: 'function' },
    { name: 'bar', signature: 'bar(x, height, width=0.8)', insertText: 'bar()', doc: 'Make a bar plot.', type: 'function' },
    { name: 'hist', signature: 'hist(x, bins=10, density=False)', insertText: 'hist(bins=20)', doc: 'Compute and draw the histogram of x.', type: 'function' },
    { name: 'title', signature: 'title("Plot Title", fontsize=12)', insertText: 'title("")', doc: 'Set a title for the Axes.', type: 'function' },
    { name: 'xlabel', signature: 'xlabel("X Axis Label")', insertText: 'xlabel("")', doc: 'Set the label for the x-axis.', type: 'function' },
    { name: 'ylabel', signature: 'ylabel("Y Axis Label")', insertText: 'ylabel("")', doc: 'Set the label for the y-axis.', type: 'function' },
    { name: 'legend', signature: 'legend(loc="best")', insertText: 'legend()', doc: 'Place a legend on the Axes.', type: 'function' },
    { name: 'grid', signature: 'grid(True, linestyle="--")', insertText: 'grid(True, linestyle="--", alpha=0.6)', doc: 'Configure the grid lines.', type: 'function' },
    { name: 'subplot', signature: 'subplot(nrows, ncols, index)', insertText: 'subplot(1, 2, 1)', doc: 'Add an Axes to the current figure or retrieve an existing Axes.', type: 'function' },
    { name: 'tight_layout', signature: 'tight_layout()', insertText: 'tight_layout()', doc: 'Adjust padding between and around subplots.', type: 'function' },
    { name: 'show', signature: 'show()', insertText: 'show()', doc: 'Display all open figures.', type: 'function' },
  ],

  // --- Seaborn (sns.) ---
  sns: [
    { name: 'heatmap', signature: 'heatmap(data, annot=True, cmap="coolwarm")', insertText: 'heatmap(corr, annot=True, cmap="coolwarm")', doc: 'Plot rectangular data as a color-encoded matrix.', type: 'function' },
    { name: 'scatterplot', signature: 'scatterplot(data=df, x=..., y=..., hue=...)', insertText: 'scatterplot(data=df, x="", y="")', doc: 'Draw a scatter plot with possibility of several semantic groupings.', type: 'function' },
    { name: 'lineplot', signature: 'lineplot(data=df, x=..., y=...)', insertText: 'lineplot(data=df, x="", y="")', doc: 'Draw a line plot with possibility of several semantic groupings.', type: 'function' },
    { name: 'histplot', signature: 'histplot(data=df, x=..., kde=True)', insertText: 'histplot(kde=True)', doc: 'Plot univariate or bivariate histograms to show distributions of datasets.', type: 'function' },
    { name: 'boxplot', signature: 'boxplot(data=df, x=..., y=...)', insertText: 'boxplot(data=df)', doc: 'Draw a box plot to show distributions with respect to categories.', type: 'function' },
    { name: 'pairplot', signature: 'pairplot(data=df, hue=...)', insertText: 'pairplot(df)', doc: 'Plot pairwise relationships in a dataset.', type: 'function' },
    { name: 'barplot', signature: 'barplot(data=df, x=..., y=...)', insertText: 'barplot(data=df, x="", y="")', doc: 'Show point estimates and confidence intervals as rectangular bars.', type: 'function' },
    { name: 'set_theme', signature: 'set_theme(style="whitegrid")', insertText: 'set_theme(style="whitegrid")', doc: 'Set the aesthetic style of the plots.', type: 'function' },
  ],

  // --- Scikit-Learn Model / Estimator (model., clf., reg.) ---
  model: [
    { name: 'fit', signature: 'fit(X, y)', insertText: 'fit(X_train, y_train)', doc: 'Fit the model according to the given training data.', type: 'method' },
    { name: 'predict', signature: 'predict(X)', insertText: 'predict(X_test)', doc: 'Predict class labels or values for samples in X.', type: 'method' },
    { name: 'predict_proba', signature: 'predict_proba(X)', insertText: 'predict_proba(X_test)', doc: 'Probability estimates for each class.', type: 'method' },
    { name: 'score', signature: 'score(X, y)', insertText: 'score(X_test, y_test)', doc: 'Return the mean accuracy (classification) or R² coefficient (regression).', type: 'method' },
    { name: 'feature_importances_', signature: 'feature_importances_ -> array', insertText: 'feature_importances_', doc: 'The impurity-based feature importances.', type: 'attribute' },
  ],
};

// Aliases
PYTHON_COMPLETIONS['clf'] = PYTHON_COMPLETIONS['model'];
PYTHON_COMPLETIONS['reg'] = PYTHON_COMPLETIONS['model'];
PYTHON_COMPLETIONS['rf'] = PYTHON_COMPLETIONS['model'];
