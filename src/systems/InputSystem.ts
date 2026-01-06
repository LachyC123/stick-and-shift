// InputSystem for Stick & Shift
// Handles keyboard and mouse input with responsive controls
// Improved: instant shoot on keydown + pointer, aim assist

import Phaser from 'phaser';

export interface InputState {
  // Movement
  moveX: number;  // -1 to 1
  moveY: number;  // -1 to 1
  isMoving: boolean;
  
  // Actions (all trigger on press, not release)
  shoot: boolean;
  shootHeld: boolean;
  shootReleased: boolean;
  pass: boolean;
  tackle: boolean;
  dodge: boolean;
  
  // Mouse
  aimAngle: number;
  aimX: number;
  aimY: number;
  mouseDown: boolean;
  mouseJustDown: boolean;
  hasMouseMoved: boolean;  // Track if mouse has been used for aiming
  
  // UI
  pause: boolean;
  confirm: boolean;
  cancel: boolean;
  showHelp: boolean;
}

export class InputSystem {
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private actionKeys?: {
    space: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    q: Phaser.Input.Keyboard.Key;
    escape: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
    p: Phaser.Input.Keyboard.Key;
    h: Phaser.Input.Keyboard.Key;
  };
  
  private shootChargeStart: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private hasMouseMoved: boolean = false;
  private wasMouseDown: boolean = false;
  
  // Aim assist settings
  private aimAssistStrength: number = 0.5;  // 0-1, can be set from settings
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupMouseTracking();
  }
  
  private setupKeyboard(): void {
    if (!this.scene.input.keyboard) return;
    
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    
    this.wasd = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    
    this.actionKeys = {
      space: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shift: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      e: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      q: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      escape: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      enter: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      p: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      h: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H)
    };
  }
  
  private setupMouseTracking(): void {
    // Track mouse movement to know if player is using mouse aim
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const moved = Math.abs(pointer.x - this.lastMouseX) > 5 || 
                    Math.abs(pointer.y - this.lastMouseY) > 5;
      if (moved) {
        this.hasMouseMoved = true;
        this.lastMouseX = pointer.x;
        this.lastMouseY = pointer.y;
      }
    });
  }
  
  getState(playerX: number = 0, playerY: number = 0): InputState {
    const state: InputState = {
      moveX: 0,
      moveY: 0,
      isMoving: false,
      shoot: false,
      shootHeld: false,
      shootReleased: false,
      pass: false,
      tackle: false,
      dodge: false,
      aimAngle: 0,
      aimX: 0,
      aimY: 0,
      mouseDown: false,
      mouseJustDown: false,
      hasMouseMoved: this.hasMouseMoved,
      pause: false,
      confirm: false,
      cancel: false,
      showHelp: false
    };
    
    // Movement from arrow keys
    if (this.cursors) {
      if (this.cursors.left.isDown) state.moveX -= 1;
      if (this.cursors.right.isDown) state.moveX += 1;
      if (this.cursors.up.isDown) state.moveY -= 1;
      if (this.cursors.down.isDown) state.moveY += 1;
    }
    
    // Movement from WASD
    if (this.wasd) {
      if (this.wasd.A.isDown) state.moveX -= 1;
      if (this.wasd.D.isDown) state.moveX += 1;
      if (this.wasd.W.isDown) state.moveY -= 1;
      if (this.wasd.S.isDown) state.moveY += 1;
    }
    
    // Normalize diagonal movement
    if (state.moveX !== 0 && state.moveY !== 0) {
      const length = Math.sqrt(state.moveX * state.moveX + state.moveY * state.moveY);
      state.moveX /= length;
      state.moveY /= length;
    }
    
    state.isMoving = state.moveX !== 0 || state.moveY !== 0;
    
    // Actions - SHOOT triggers on keydown (JustDown), not release
    if (this.actionKeys) {
      const spaceDown = this.actionKeys.space.isDown;
      // Shoot on press (instant), not release
      state.shoot = Phaser.Input.Keyboard.JustDown(this.actionKeys.space);
      state.shootHeld = spaceDown;
      state.shootReleased = Phaser.Input.Keyboard.JustUp(this.actionKeys.space);
      
      // Track charge time from when space was pressed
      if (state.shoot) {
        this.shootChargeStart = this.scene.time.now;
      }
      
      // Other actions - all on press
      state.dodge = Phaser.Input.Keyboard.JustDown(this.actionKeys.shift);
      state.pass = Phaser.Input.Keyboard.JustDown(this.actionKeys.e);
      state.tackle = Phaser.Input.Keyboard.JustDown(this.actionKeys.q);
      
      // UI
      state.pause = Phaser.Input.Keyboard.JustDown(this.actionKeys.escape) || 
                    Phaser.Input.Keyboard.JustDown(this.actionKeys.p);
      state.confirm = Phaser.Input.Keyboard.JustDown(this.actionKeys.enter);
      state.cancel = Phaser.Input.Keyboard.JustDown(this.actionKeys.escape);
      state.showHelp = Phaser.Input.Keyboard.JustDown(this.actionKeys.h);
    }
    
    // Mouse handling
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    state.aimX = worldPoint.x;
    state.aimY = worldPoint.y;
    state.mouseDown = pointer.isDown;
    
    // Detect mouse just pressed (for shooting on click)
    state.mouseJustDown = pointer.isDown && !this.wasMouseDown;
    this.wasMouseDown = pointer.isDown;
    
    // Calculate aim angle - with optional aim assist
    if (this.hasMouseMoved) {
      // Use mouse aim
      state.aimAngle = Phaser.Math.Angle.Between(playerX, playerY, worldPoint.x, worldPoint.y);
    } else {
      // Keyboard-only: use movement direction or default toward goal
      if (state.isMoving) {
        state.aimAngle = Math.atan2(state.moveY, state.moveX);
      } else {
        // Default: aim toward opponent goal (right side)
        state.aimAngle = 0;  // Right
      }
    }
    
    // Mouse click on pitch = shoot (unless over UI)
    if (state.mouseJustDown && !this.isOverUI(pointer.x, pointer.y)) {
      state.shoot = true;
      if (this.shootChargeStart === 0) {
        this.shootChargeStart = this.scene.time.now;
      }
    }
    
    return state;
  }
  
  // Check if pointer is over UI elements (top 100px reserved for HUD)
  private isOverUI(x: number, y: number): boolean {
    // HUD area at top
    if (y < 130) return true;
    // Cooldown bar area at bottom
    if (y > this.scene.cameras.main.height - 100) return true;
    return false;
  }
  
  // Get aim angle with aim assist applied
  getAimWithAssist(playerX: number, playerY: number, targetGoalX: number, targetGoalY: number): number {
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    const mouseAngle = Phaser.Math.Angle.Between(playerX, playerY, worldPoint.x, worldPoint.y);
    const goalAngle = Phaser.Math.Angle.Between(playerX, playerY, targetGoalX, targetGoalY);
    
    if (!this.hasMouseMoved || this.aimAssistStrength === 0) {
      return goalAngle;  // Full assist when no mouse
    }
    
    // Blend between mouse aim and goal aim based on assist strength
    // Only assist if aiming roughly toward goal
    const angleDiff = Phaser.Math.Angle.Wrap(goalAngle - mouseAngle);
    if (Math.abs(angleDiff) < Math.PI / 3) {  // Within 60 degrees of goal
      return mouseAngle + angleDiff * this.aimAssistStrength * 0.3;
    }
    
    return mouseAngle;
  }
  
  // Get how long shoot has been held (for charge shots)
  getShootChargeTime(): number {
    if (this.actionKeys?.space.isDown || this.scene.input.activePointer.isDown) {
      return this.scene.time.now - this.shootChargeStart;
    }
    return 0;
  }
  
  // Get charge percentage (0-1, capped at 1 second)
  getShootChargePct(): number {
    return Math.min(this.getShootChargeTime() / 1000, 1);
  }
  
  // Reset charge timer
  resetCharge(): void {
    this.shootChargeStart = 0;
  }
  
  // Set aim assist strength (0-1)
  setAimAssistStrength(strength: number): void {
    this.aimAssistStrength = Phaser.Math.Clamp(strength, 0, 1);
  }
  
  getAimAssistStrength(): number {
    return this.aimAssistStrength;
  }
  
  // Check if a specific key is down
  isKeyDown(key: string): boolean {
    const keyObj = this.scene.input.keyboard?.addKey(key);
    return keyObj?.isDown || false;
  }
  
  // Disable input (for cutscenes, etc.)
  disable(): void {
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.enabled = false;
    }
  }
  
  // Enable input
  enable(): void {
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.enabled = true;
    }
  }
  
  // Clean up
  destroy(): void {
    // Keys are automatically cleaned up with the scene
  }
}
