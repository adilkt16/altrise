// Quick test script to test puzzle modal functionality
const testPuzzleModal = async () => {
  console.log('🧪 Testing puzzle modal functionality...');
  
  try {
    // Import the modal manager
    const { AlarmModalManager } = require('./src/services/AlarmModalManager');
    const modalManager = AlarmModalManager.getInstance();
    
    // Test with basic math puzzle
    const testModalData = {
      alarmId: 'test-puzzle-123',
      title: 'Test Puzzle Alarm',
      label: 'Math Test',
      originalTime: '12:00',
      endTime: null,
      puzzleType: 'basic_math',  // Explicitly set to basic_math
      onDismiss: () => {
        console.log('✅ Test alarm dismissed');
        modalManager.hideAlarmModal();
      },
      onSnooze: () => {
        console.log('😴 Test alarm snoozed');
        modalManager.hideAlarmModal();
      },
    };
    
    console.log('🧪 Test modal data:', testModalData);
    
    // Show the modal
    const success = await modalManager.showAlarmModal(testModalData);
    
    if (success) {
      console.log('✅ Puzzle modal test successful!');
    } else {
      console.error('❌ Puzzle modal test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing puzzle modal:', error);
  }
};

// Export for manual testing
module.exports = { testPuzzleModal };
