/** Download JSON file in browser */
export function downloadJson(filename: string, data: unknown): void {
  const body = JSON.stringify(data, null, 2);
  const blob = new Blob([body], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download XML text file in browser */
export function downloadXml(filename: string, xml: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xml') ? filename : `${filename}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}
