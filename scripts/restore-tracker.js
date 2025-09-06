#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function getStatusIcon(status) {
  const icons = {
    'pending': '⏳',
    'in_progress': '🔄', 
    'completed': '✅',
    'blocked': '🚫',
    'testing': '🧪'
  };
  return icons[status] || '❓';
}

function getPriorityColor(priority) {
  const priorityColors = {
    'CRITICAL': 'red',
    'HIGH': 'yellow',
    'MEDIUM': 'blue',
    'LOW': 'cyan'
  };
  return priorityColors[priority] || 'reset';
}

function loadRestorePlan() {
  try {
    const planPath = path.join(process.cwd(), 'restore.json');
    const planContent = fs.readFileSync(planPath, 'utf8');
    return JSON.parse(planContent);
  } catch (error) {
    console.error(colorize('red', '❌ Ошибка загрузки restore.json:'), error.message);
    process.exit(1);
  }
}

function saveRestorePlan(plan) {
  try {
    const planPath = path.join(process.cwd(), 'restore.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(colorize('green', '✅ План сохранён'));
  } catch (error) {
    console.error(colorize('red', '❌ Ошибка сохранения:'), error.message);
  }
}

function showStatus() {
  const plan = loadRestorePlan();
  
  console.log(colorize('bright', `\n📋 ${plan.title}\n`));
  console.log(colorize('cyan', `Описание: ${plan.description}\n`));
  
  // Текущий статус
  console.log(colorize('bright', '🎯 Текущий статус:'));
  const status = plan.currentStatus;
  console.log(`   Deployed: ${status.deployed ? '✅' : '❌'}`);
  console.log(`   Site Accessible: ${status.siteAccessible ? '✅' : '❌'}`);
  console.log(`   Core APIs: ${status.coreAPIsWorking ? '✅' : '❌'}`);
  console.log(`   Excluded APIs: ${colorize('yellow', status.excludedAPIs)}`);
  console.log(`   Excluded Features: ${colorize('yellow', status.excludedFeatures.join(', '))}\n`);

  // Фазы и задачи
  plan.phases.forEach(phase => {
    const phaseColor = getPriorityColor(phase.priority);
    console.log(colorize('bright', `📊 Phase ${phase.phase}: ${phase.title}`));
    console.log(colorize(phaseColor, `   Priority: ${phase.priority} | Est. Days: ${phase.estimatedDays}`));
    console.log(colorize('cyan', `   ${phase.description}\n`));
    
    phase.tasks.forEach(task => {
      const taskColor = getPriorityColor(task.priority);
      console.log(`   ${getStatusIcon(task.status)} ${colorize(taskColor, task.title)}`);
      
      task.subtasks.forEach(subtask => {
        const subtaskStatus = subtask.status || 'pending';
        console.log(`      ${getStatusIcon(subtaskStatus)} ${subtask.title}`);
        if (subtask.description) {
          console.log(`         ${colorize('cyan', subtask.description)}`);
        }
        if (subtask.files && subtask.files.length > 0) {
          console.log(`         📁 Files: ${colorize('yellow', subtask.files.join(', '))}`);
        }
        if (subtask.testEndpoint) {
          console.log(`         🔗 Test: ${colorize('blue', subtask.testEndpoint)}`);
        }
        if (subtask.dependencies && subtask.dependencies.length > 0) {
          console.log(`         🔗 Deps: ${colorize('magenta', subtask.dependencies.join(', '))}`);
        }
        console.log();
      });
    });
  });

  // Timeline
  console.log(colorize('bright', '\n⏰ Timeline:'));
  console.log(`   Total estimated: ${colorize('yellow', plan.timeline.totalEstimatedDays)} days\n`);
  
  plan.timeline.phases.forEach(p => {
    console.log(`   Phase ${p.phase}: Days ${p.startDay}-${p.startDay + p.days - 1} (${p.days} days)`);
  });
}

function updateTaskStatus() {
  const plan = loadRestorePlan();
  const args = process.argv.slice(3);
  
  if (args.length < 2) {
    console.log(colorize('red', '❌ Usage: npm run restore update <task-id> <status>'));
    console.log(colorize('cyan', '   Statuses: pending, in_progress, completed, blocked, testing'));
    return;
  }
  
  const [taskId, newStatus] = args;
  const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'testing'];
  
  if (!validStatuses.includes(newStatus)) {
    console.log(colorize('red', `❌ Invalid status: ${newStatus}`));
    console.log(colorize('cyan', `   Valid statuses: ${validStatuses.join(', ')}`));
    return;
  }
  
  let updated = false;
  
  // Поиск и обновление задачи
  plan.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      if (task.id === taskId) {
        task.status = newStatus;
        updated = true;
        console.log(colorize('green', `✅ Updated task "${task.title}" to ${getStatusIcon(newStatus)} ${newStatus}`));
      }
      
      task.subtasks.forEach(subtask => {
        if (subtask.id === taskId) {
          subtask.status = newStatus;
          updated = true;
          console.log(colorize('green', `✅ Updated subtask "${subtask.title}" to ${getStatusIcon(newStatus)} ${newStatus}`));
        }
      });
    });
  });
  
  if (updated) {
    saveRestorePlan(plan);
  } else {
    console.log(colorize('red', `❌ Task not found: ${taskId}`));
  }
}

function showNextTasks() {
  const plan = loadRestorePlan();
  console.log(colorize('bright', '\n🎯 Next available tasks:\n'));
  
  plan.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      task.subtasks.forEach(subtask => {
        if (!subtask.status || subtask.status === 'pending') {
          // Проверяем зависимости
          const allDepsCompleted = !subtask.dependencies || 
            subtask.dependencies.every(depId => {
              return plan.phases.some(p => 
                p.tasks.some(t => 
                  t.subtasks.some(s => s.id === depId && s.status === 'completed')
                )
              );
            });
          
          if (allDepsCompleted) {
            const taskColor = getPriorityColor(task.priority);
            console.log(`${getStatusIcon('pending')} ${colorize(taskColor, subtask.title)}`);
            console.log(`   📊 Phase ${phase.phase}: ${phase.title}`);
            console.log(`   🎯 Task: ${task.title}`);
            if (subtask.description) {
              console.log(`   📝 ${colorize('cyan', subtask.description)}`);
            }
            if (subtask.files) {
              console.log(`   📁 Files: ${colorize('yellow', subtask.files.join(', '))}`);
            }
            console.log(`   🆔 ID: ${colorize('magenta', subtask.id)}`);
            console.log();
          }
        }
      });
    });
  });
}

// Main CLI logic
const command = process.argv[2];

switch (command) {
  case 'status':
  case undefined:
    showStatus();
    break;
  case 'update':
    updateTaskStatus();
    break;
  case 'next':
    showNextTasks();
    break;
  default:
    console.log(colorize('yellow', '📋 Restore Plan Tracker'));
    console.log('\nCommands:');
    console.log('  npm run restore status  - Show full status');
    console.log('  npm run restore next     - Show next available tasks');
    console.log('  npm run restore update <task-id> <status> - Update task status');
    console.log('\nTask statuses: pending, in_progress, completed, blocked, testing');
}
