import { DockerfileData, DockerStage, DockerCommand } from "../types/DockerfileData";

/**
 * Generate Dockerfile text from DockerfileData
 */
export function generateDockerfile(data: DockerfileData): string {
  const lines: string[] = [];

  // Add metadata as comments
  if (data.metadata) {
    lines.push(`# ${data.metadata.name}`);
    if (data.metadata.description) {
      lines.push(`# ${data.metadata.description}`);
    }
    if (data.metadata.author) {
      lines.push(`# Author: ${data.metadata.author}`);
    }
    if (data.metadata.version) {
      lines.push(`# Version: ${data.metadata.version}`);
    }
    lines.push('');
  }

  // Generate each stage
  if (data.stages && data.stages.length > 0) {
    data.stages.forEach((stage, index) => {
      if (index > 0) {
        lines.push(''); // Blank line between stages
      }

      // FROM instruction
      const fromLine = generateFromInstruction(stage);
      lines.push(fromLine);
      lines.push('');

      // Commands
      if (stage.commands && stage.commands.length > 0) {
        stage.commands.forEach((cmd) => {
          const cmdLine = generateCommand(cmd);
          if (cmdLine) {
            lines.push(cmdLine);
          }
        });
      }
    });
  }

  // Add runtime configuration as comments
  if (data.runtime) {
    lines.push('');
    lines.push('# Runtime Configuration:');
    lines.push(`# Image: ${data.runtime.imageName}:${data.runtime.imageTag || 'latest'}`);
    
    if (data.runtime.containerName) {
      lines.push(`# Container Name: ${data.runtime.containerName}`);
    }
    
    if (data.runtime.portMappings && data.runtime.portMappings.length > 0) {
      const ports = data.runtime.portMappings
        .map(p => `${p.hostPort || p.containerPort}:${p.containerPort}`)
        .join(', ');
      lines.push(`# Port Mappings: ${ports}`);
    }
    
    if (data.runtime.environmentVariables && data.runtime.environmentVariables.length > 0) {
      const envs = data.runtime.environmentVariables
        .map(e => `${e.key}=${e.value}`)
        .join(', ');
      lines.push(`# Environment: ${envs}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate FROM instruction with optional stage name and platform
 */
function generateFromInstruction(stage: DockerStage): string {
  let line = 'FROM';
  
  if (stage.platform) {
    line += ` --platform=${stage.platform}`;
  }
  
  line += ` ${stage.baseImage || 'node:18-alpine'}`;
  
  if (stage.stageName) {
    line += ` AS ${stage.stageName}`;
  }
  
  return line;
}

/**
 * Generate command line from DockerCommand
 */
function generateCommand(cmd: DockerCommand): string {
  if (!cmd.value || cmd.value.trim() === '') {
    return '';
  }

  const formattedValue = formatCommandValue(cmd.type, cmd.value);
  let line = `${cmd.type} ${formattedValue}`;
  
  if (cmd.comment) {
    line += ` # ${cmd.comment}`;
  }
  
  return line;
}

/**
 * Format command value based on type for better readability
 */
function formatCommandValue(type: string, value: string): string {
  const trimmedValue = value.trim();
  
  switch (type) {
    case 'RUN':
      // Handle multi-line RUN commands with &&
      if (trimmedValue.includes('&&')) {
        return trimmedValue
          .split('&&')
          .map((part, i) => (i === 0 ? part.trim() : `  && ${part.trim()}`))
          .join(' \\\n');
      }
      return trimmedValue;
    
    case 'ENV':
    case 'LABEL':
      // Format key=value pairs nicely
      if (trimmedValue.includes('=')) {
        const pairs = trimmedValue.split(/\s+/).filter(Boolean);
        if (pairs.length > 1) {
          return pairs
            .map((pair, i) => (i === 0 ? pair : `    ${pair}`))
            .join(' \\\n');
        }
      }
      return trimmedValue;
    
    case 'COPY':
    case 'ADD':
      // Normalize spacing
      return trimmedValue.replace(/\s+/g, ' ');
    
    case 'EXPOSE':
      // Format ports
      return trimmedValue.replace(/\s+/g, ' ');
    
    case 'CMD':
    case 'ENTRYPOINT':
      // Try to format as JSON array if it looks like one
      if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmedValue);
          return JSON.stringify(parsed, null, 2).split('\n').join(' ');
        } catch {
          return trimmedValue;
        }
      }
      return trimmedValue;
    
    default:
      return trimmedValue;
  }
}

/**
 * Generate a default empty Dockerfile message
 */
export function generateEmptyDockerfileMessage(): string {
  return `# No stages defined yet
# Click "Add Stage" to start building your Dockerfile

# Example Dockerfile structure:
# FROM node:18-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# EXPOSE 3000
# CMD ["npm", "start"]`;
}
