'use strict';

const SECURITY_PROBE_PATTERNS = [
  /\/\.npmrc(?:$|\?)/i,
  /\/\.env(?:$|[.?/])/i,
  /\/\.git(?:\/|$)/i,
  /\/\.git\/config(?:$|\?)/i,
  /\/\.docker(?:\/|$)/i,
  /\/\.docker\/config\.json(?:$|\?)/i,
  /\/\.gem\/credentials(?:$|\?)/i,
  /\/\.ssh(?:\/|$)/i,
  /\/\.aws(?:\/|$)/i,
  /\/wp-admin(?:\/|$|\?)/i,
  /\/wp-config\.php(?:$|\?)/i,
  /\/phpmyadmin(?:\/|$|\?)/i,
  /\/pma(?:\/|$|\?)/i,
  /\/adminer(?:\.php)?(?:$|\?)/i,
  /\/etc\/passwd(?:$|\?)/i,
  /\/etc\/shadow(?:$|\?)/i,
  /\/\.htpasswd(?:$|\?)/i,
  /\/\.bash_history(?:$|\?)/i,
  /\/config\/database\.yml(?:$|\?)/i,
  /\/\.DS_Store(?:$|\?)/i,
  /\/server-status(?:$|\?)/i,
  /\/phpinfo\.php(?:$|\?)/i,
];

function isSecurityProbePath(urlPath = '') {
  return SECURITY_PROBE_PATTERNS.some((pattern) => pattern.test(urlPath));
}

function classifyBotRequestPath(urlPath = '') {
  return isSecurityProbePath(urlPath) ? 'security_probe' : 'ai_discovery';
}

module.exports = {
  SECURITY_PROBE_PATTERNS,
  classifyBotRequestPath,
  isSecurityProbePath,
};
