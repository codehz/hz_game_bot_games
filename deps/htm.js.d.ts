declare const htm: {
  bind<HResult>(
    h: (type: string, props: Record<string, any>, ...children: any[]) => HResult
  ): (strings: TemplateStringsArray, ...values: any[]) => HResult;
};
export default htm;
