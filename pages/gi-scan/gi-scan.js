Page({
  data: {
    tempImagePath: '', // 临时图片路径
  },

  // 选择图片
  chooseImage() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照
          this.takePhoto();
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.selectFromAlbum();
        }
      }
    });
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success: (res) => {
        this.setData({
          tempImagePath: res.tempFiles[0].tempFilePath
        });
      }
    });
  },

  // 从相册选择
  selectFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          tempImagePath: res.tempFiles[0].tempFilePath
        });
      }
    });
  },

  // 提交图片
  submitImage() {
    if (!this.data.tempImagePath) {
      return;
    }
    
    // TODO: 调用coze工作流的逻辑将在这里实现
    wx.showLoading({
      title: '识别中...',
    });
    
    // 模拟API调用
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '识别完成',
        icon: 'success'
      });
    }, 2000);
  }
}); 