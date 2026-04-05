import { IRouteAccessRule } from '../models/route-access-rule.model';

export function matchPath(rulePath: string, requestPath: string): boolean {
  const ruleSegments = rulePath.split('/');
  const requestSegments = requestPath.split('/');

  if (ruleSegments.length !== requestSegments.length) {
    return false;
  }

  return ruleSegments.every((segment, index) =>
    segment.startsWith(':') || segment === requestSegments[index]
  );
}

export function findMatchingRule(
  rules: IRouteAccessRule[],
  path: string,
  method: string
): IRouteAccessRule | undefined {
  return rules.find((rule) =>
    matchPath(rule.path, path) && rule.method === method.toUpperCase()
  );
}
